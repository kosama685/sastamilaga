import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const migration=readFileSync(new URL('./migrations/20261125-catalog-publication-evidence.sql',import.meta.url),'utf8');
function db(){const d=new DatabaseSync(':memory:');d.exec('PRAGMA foreign_keys=ON;');d.exec(migration);return d;}
const p="INSERT INTO catalog_publication_evidence(product_id,locale,publication_version,content_revision,canonical_url,page_type,evidence_ref,evidence_updated_at,evidence_expires_at) VALUES(?,?,?,?,?,?,?,?,?)";
const m="INSERT INTO catalog_merchant_evidence(product_id,locale,publication_version,content_revision,market,offer_evidence_ref,offer_updated_at,offer_expires_at) VALUES(?,?,?,?,?,?,?,?)";
const row=['id1','en','release1','rev1','https://sastamilaga.com/p/test/','informational','fixture',100,200];
test('new evidence defaults to no approvals',()=>{const d=db();try{d.prepare(p).run(...row);const r=d.prepare('SELECT content_approved,route_verified,media_verified FROM catalog_publication_evidence').get();assert.equal(r.content_approved,0);assert.equal(r.route_verified,0);assert.equal(r.media_verified,0);}finally{d.close();}});
test('duplicate canonical within a release fails',()=>{const d=db();try{d.prepare(p).run(...row);assert.throws(()=>d.prepare(p).run('id2',...row.slice(1)));}finally{d.close();}});
test('expiry and invalid flags rejected',()=>{const d=db();try{assert.throws(()=>d.prepare(p).run(...row.slice(0,8),100));d.prepare(p).run(...row);assert.throws(()=>d.exec('UPDATE catalog_publication_evidence SET content_approved=2'));}finally{d.close();}});
test('merchant evidence requires matching revision and market',()=>{const d=db();try{d.prepare(p).run(...row);assert.throws(()=>d.prepare(m).run('id1','en','release1','oldrev','US','fixture',100,200));assert.throws(()=>d.prepare(m).run('id1','en','release1','rev1','us','fixture',100,200));d.prepare(m).run('id1','en','release1','rev1','US','fixture',100,200);assert.equal(d.prepare('SELECT checkout_verified FROM catalog_merchant_evidence').get().checkout_verified,0);}finally{d.close();}});
