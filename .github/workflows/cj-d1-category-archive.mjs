#!/usr/bin/env node
// CJ -> non-production GitHub archive only. Never publishes pages, links, redirects or sitemaps.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const account=process.env.CLOUDFLARE_ACCOUNT_ID||'';
const token=process.env.CLOUDFLARE_API_TOKEN||'';
const db=process.env.SASTA_D1_DATABASE_ID||'ac28088f-6a54-4d29-8c64-821661efe88f';
const root='archive/cj', stateFile=path.join(root,'state.json');
if(!/^[a-f0-9]{32}$/i.test(account)||!token||!/^[a-f0-9-]{36}$/i.test(db))throw Error('Cloudflare credentials unavailable; no changes made');
if(!fs.existsSync(stateFile))throw Error('Missing baseline checkpoint; refusing duplicate historical import');
const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
if(state.source_database_id!==db||!Number.isSafeInteger(state.last_rowid)||!Number.isSafeInteger(state.baseline_rows))throw Error('Invalid checkpoint');
if(state.live_publication_enabled!==false||state.seo_indexing_enabled!==false)throw Error('Archive must remain unlinked and unindexed');
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+db+'/query';
async function query(sql,params=[]){
  if(!/^SELECT\s/i.test(sql)||sql.includes(';'))throw Error('Only single SELECT queries allowed');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql,params:params.map(String)}),signal:AbortSignal.timeout(45000)});
  const payload=await response.json();
  if(!response.ok||!payload.success||!Array.isArray(payload.result)||!payload.result[0])throw Error('D1 read failed (HTTP '+response.status+'); checkpoint not advanced');
  return payload.result[0].results||[];
}
const tally=(await query('SELECT COUNT(*) AS total, MAX(rowid) AS max_rowid, MAX(imported_at) AS newest_import FROM catalog_products_cj'))[0];
const total=Number(tally?.total), sourceMax=Number(tally?.max_rowid||0);
if(!Number.isSafeInteger(total)||!Number.isSafeInteger(sourceMax)||total<state.baseline_rows||sourceMax<state.last_rowid)throw Error('D1 source reset or incomplete: import paused');
if(total<state.last_seen_source_total&&sourceMax>state.last_rowid)throw Error('D1 count decreased; manual reconciliation required');
const slug=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,62).replace(/-+$/g,'')||'uncategorized';
const catKey=s=>slug(s)+'-'+crypto.createHash('sha256').update(s).digest('hex').slice(0,8);
const checked=new Date().toISOString();
const day=new Date(Date.now()+3*3600000).toISOString().slice(0,10);
const grouped=new Map();
let cursor=state.last_rowid, imported=0;
while(cursor<sourceMax&&imported<20000){
  const limit=Math.min(1000,20000-imported);
  const rows=await query('SELECT rowid AS rid, sku, cj_product_id, name, categories, images, imported_at FROM catalog_products_cj WHERE rowid > ? AND rowid <= ? ORDER BY rowid LIMIT ?',[cursor,sourceMax,limit]);
  if(!rows.length)throw Error('D1 cursor stalled; checkpoint unchanged');
  for(const item of rows){
    const rid=Number(item.rid);
    if(!Number.isSafeInteger(rid)||rid<=cursor)throw Error('D1 rowid sequence invalid');
    cursor=rid;
    const category=String(item.categories||'Uncategorized').trim()||'Uncategorized';
    const title=String(item.name||'').trim();
    const id=String(item.cj_product_id||'').trim();
    const record={
      d1_rowid:rid,cj_product_id:id||null,sku:item.sku||null,title:title||null,
      original_category:category,source_image:/^https:\/\//i.test(String(item.images||''))?item.images:null,
      original_imported_at:item.imported_at||null,
      proposed_slug_only:slug(title).slice(0,62)+'-'+slug(id||item.sku||String(rid)).slice(0,32),
      status:'supplier_archive_only',published:false,linked_to_storefront:false,
      index_eligible:false,canonical_url:null,retail_offer_verified:false
    };
    const k=catKey(category);
    if(!grouped.has(k))grouped.set(k,[]);
    grouped.get(k).push(JSON.stringify(record));
    imported++;
  }
  if(rows.length<limit)break;
}
if(cursor<sourceMax&&imported===0)throw Error('D1 cursor stalled');
for(const [category,lines] of grouped){
  const file=path.join(root,'by-category',category,day+'.jsonl');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.appendFileSync(file,lines.join('\n')+'\n');
}
const next={...state,last_rowid:cursor,last_seen_source_total:total,last_seen_source_max_rowid:sourceMax,
  last_seen_imported_at:tally.newest_import,last_checked_at_utc:checked,last_run_new_rows:imported,
  last_run_categories:grouped.size,total_new_rows_archived:Number(state.total_new_rows_archived||0)+imported,
  backlog_rowid_gap:sourceMax-cursor,live_publication_enabled:false,seo_indexing_enabled:false};
const report={checked_at_utc:checked,source_total_rows:total,baseline_preserved_rows:state.baseline_rows,
  imported_new_records:imported,category_files_written:grouped.size,pending_rowid_gap:sourceMax-cursor,
  website_changes:0,public_links_created:0,product_pages_published:0,
  status:cursor<sourceMax?'backlog_resumes_next_schedule':'caught_up_to_source_rowid'};
fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(stateFile,JSON.stringify(next,null,2)+'\n');
fs.writeFileSync(path.join(root,'latest-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '### CJ supplier archive (zero storefront changes)\n\n- Source rows: '+total+
  '\n- New rows archived: '+imported+'\n- Category files updated: '+grouped.size+
  '\n- Backlog rowid gap: '+report.pending_rowid_gap+'\n- New public links or product pages: **0**\n');
