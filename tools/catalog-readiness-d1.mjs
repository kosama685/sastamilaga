#!/usr/bin/env node
/**
 * Read-only D1 catalogue readiness audit for Sasta Milaga.
 * No product publication, price edits, sitemap writes, or Merchant API submissions.
 *
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
 * Override SASTA_D1_DATABASE_ID if the catalogue moves.
 * Output: artifacts/catalog-readiness.json and artifacts/catalog-readiness.md.
 */
import fs from 'node:fs/promises';

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const DATABASE = process.env.SASTA_D1_DATABASE_ID || 'ac28088f-6a54-4d29-8c64-821661efe88f';
if (!/^[a-f0-9]{32}$/i.test(ACCOUNT) || !TOKEN || !/^[a-f0-9-]{36}$/i.test(DATABASE)) {
  console.error('Missing Cloudflare account/token or invalid D1 database ID. No changes made.');
  process.exit(2);
}

const URL = 'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT +
  '/d1/database/' + DATABASE + '/query';

async function readOnlyQuery(sql) {
  if (!/^\s*SELECT\b/i.test(sql) || /;\s*\S/.test(sql)) {
    throw new Error('Only a single read-only SELECT statement is permitted');
  }
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await res.json();
  if (!res.ok || !body.success || !Array.isArray(body.result) || !body.result[0]) {
    throw new Error('Cloudflare D1 read failed (HTTP ' + res.status + '); no product data changed');
  }
  return body.result[0].results || [];
}

const countsSql = [
  "SELECT 'cj' AS source, COUNT(*) AS records FROM catalog_products_cj",
  "SELECT 'woo_export' AS source, COUNT(*) AS records FROM catalog_products_woo_export",
  "SELECT 'shopify_export' AS source, COUNT(*) AS records FROM catalog_products_shopify_export",
  "SELECT 'pilot' AS source, COUNT(*) AS records FROM catalog_products_pilot"
];
const detailsSql =
  "SELECT COUNT(*) AS records, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(name,'')))>0 THEN 1 ELSE 0 END) AS named, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(images,'')))>0 AND TRIM(images) NOT IN ('[]','null') THEN 1 ELSE 0 END) AS has_image_field, " +
  "SUM(CASE WHEN CAST(regular_price AS REAL)>0 THEN 1 ELSE 0 END) AS positive_price, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(description,'')))>=100 THEN 1 ELSE 0 END) AS description_100_plus, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(short_description,'')))>0 THEN 1 ELSE 0 END) AS short_description, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(seo_description_en,'')))>0 THEN 1 ELSE 0 END) AS seo_description, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(in_stock,'')))>0 THEN 1 ELSE 0 END) AS stock_recorded, " +
  "SUM(CASE WHEN LOWER(TRIM(COALESCE(published,''))) IN ('1','true','publish','published') THEN 1 ELSE 0 END) AS explicitly_published, " +
  "SUM(CASE WHEN LENGTH(TRIM(COALESCE(categories,'')))>0 AND TRIM(categories) NOT IN ('[]','null') THEN 1 ELSE 0 END) AS categories_recorded " +
  "FROM catalog_products_cj";

const counts = [];
for (const sql of countsSql) {
  const rows = await readOnlyQuery(sql);
  counts.push({ source: rows[0].source, records: Number(rows[0].records) });
}
const rows = await readOnlyQuery(detailsSql);
if (rows.length !== 1) throw new Error('Unexpected D1 summary result');
const fields = Object.fromEntries(Object.entries(rows[0]).map(([k,v]) => [k, Number(v) || 0]));
const cjCount = counts.find(x => x.source === 'cj').records;
if (cjCount !== fields.records || cjCount === 0) throw new Error('Counts inconsistent: audit stopped');

const readyForMerchant = false; // Explicit human review: shipping, currency, live variants, checkout, policy and quota.
const audit = {
  audit_time_utc: new Date().toISOString(),
  source: 'Cloudflare D1, read-only SQL; catalog_products_cj',
  counts,
  fields,
  merchant_automatic_publish_enabled: readyForMerchant,
  sitemap_automatic_publish_enabled: false,
  readiness: 'BLOCKED_PENDING_VERIFICATION',
  reasons: [
    'The D1 source is not a verified set of active, orderable product offers.',
    'Published, stock, price currency, shipping and checkout eligibility need verification.',
    'Description and supplier-specific data are incomplete.',
    'Google Merchant Center product quota and Search Console authorization must be resolved.',
    'Do not generate public product sitemaps from raw catalogue rows.'
  ],
  notes: [
    'has_image_field means an image URL/text exists; image validity was not tested.',
    'positive_price means a numeric value greater than zero; currency and landed pricing were not verified.',
    'The counts do not establish live availability or Google indexation.'
  ]
};

const md = [
  '# Sasta Milaga — D1 catalogue SEO / Merchant readiness',
  '',
  'Checked: ' + audit.audit_time_utc,
  '',
  '**Status: BLOCKED_PENDING_VERIFICATION.** This audit is read-only.',
  '',
  '| Source table | Records |',
  '|---|---:|',
  ...counts.map(x => '| ' + x.source + ' | ' + x.records.toLocaleString('en-US') + ' |'),
  '',
  '## Field completeness (CJ supplier table)',
  '',
  '| Field | Rows with content / basic check passed |',
  '|---|---:|',
  ...Object.entries(fields).filter(([k]) => k !== 'records').map(([k,v]) => '| ' + k + ' | ' + v.toLocaleString('en-US') + ' |'),
  '',
  '## Blocking verification requirements',
  '',
  ...audit.reasons.map(s => '- ' + s),
  '',
  '## Important caveats',
  '',
  ...audit.notes.map(s => '- ' + s),
  '',
  'No products, feeds, sitemap URLs, Cloudflare routes or WooCommerce records were modified.',
  ''
].join('\n');

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/catalog-readiness.json', JSON.stringify(audit, null, 2) + '\n');
await fs.writeFile('artifacts/catalog-readiness.md', md);
if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, md);
}
console.log('Read-only D1 audit complete; ' + cjCount.toLocaleString('en-US') +
  ' CJ records. Status: ' + audit.readiness + '. No publication performed.');
