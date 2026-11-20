#!/usr/bin/env node
/**
 * Country evidence register + promotion gate.
 *
 * Source of truth for what a human or a system has actually verified about a market:
 *   data/landing/country-evidence.json   { "records": { "DE": { carrier, ... } } }   (empty until real evidence is supplied)
 * Output: reports/country-evidence-register.csv  (one row per registry country; missing fields are explicit)
 *
 * A market "qualifies" only when all 12 required fields are present and the approval is "approved".
 * Nothing here invents evidence: the only auto-filled fields are those the repo can prove
 * (CJ sample quote from data/landing/country-shipping-evidence.json, published returns policy URL).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const REQUIRED = ['carrier', 'carrierEvidence', 'shippingQuoteTest', 'paymentMethod', 'paymentTestResult', 'returnsPolicy',
  'refundConditions', 'taxCustomsResponsibility', 'reviewerName', 'verificationDate', 'evidenceSource', 'approvalStatus'];
const iso = /^\d{4}-\d{2}-\d{2}$/;

export function missingFields(rec = {}) {
  const miss = REQUIRED.filter(k => !String(rec[k] ?? '').trim());
  if (rec.verificationDate && !iso.test(rec.verificationDate)) miss.push('verificationDate(format YYYY-MM-DD)');
  if (rec.approvalStatus && rec.approvalStatus !== 'approved') miss.push('approvalStatus(must be "approved")');
  return [...new Set(miss)];
}
export const qualifies = rec => missingFields(rec).length === 0;

const rj = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^﻿/, ''));
const csv = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export function buildRegister() {
  const reg = rj('data/landing/locale-registry.json');
  const evFile = path.join(root, 'data/landing/country-evidence.json');
  const records = fs.existsSync(evFile) ? rj('data/landing/country-evidence.json').records || {} : {};
  const survey = fs.existsSync(path.join(root, 'data/landing/country-shipping-evidence.json')) ? rj('data/landing/country-shipping-evidence.json').results || {} : {};
  const head = ['country_code', 'country_name', 'cj_sample_quote_auto', 'returns_policy_url_auto', ...REQUIRED, 'missing_count', 'missing_fields', 'qualified'];
  const rows = reg.countries.map(c => {
    const rec = records[c.code] || {}, q = survey[c.code], miss = missingFields(rec);
    return [c.code, c.name || c.code, q ? (q.methods > 0 ? `CJ returned ${q.methods} method(s), sample item, indicative only` : q.http === 200 ? 'CJ returned no methods' : 'survey request failed') : 'not surveyed',
      'https://sastamilaga.com/returns/', ...REQUIRED.map(k => rec[k] ?? ''), miss.length, miss.join('; '), miss.length === 0 ? 'yes' : 'no'];
  });
  return {head, rows, records};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {head, rows} = buildRegister();
  fs.writeFileSync(path.join(root, 'reports/country-evidence-register.csv'), [head, ...rows].map(r => r.map(csv).join(',')).join('\n') + '\n');
  const ok = rows.filter(r => r[r.length - 1] === 'yes').length;
  console.log(JSON.stringify({countries: rows.length, qualified: ok, unqualified: rows.length - ok}));
}
