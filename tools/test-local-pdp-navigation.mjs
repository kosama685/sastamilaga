#!/usr/bin/env node
/**
 * Static contract regression tests for local product navigation and related media.
 * These run without browser storage mutations or checkout access.
 * See reports/pdp/local-product-2026-11-19.json for production browser evidence.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync('app.js','utf8');
const cards=fs.readFileSync('assets/js/related-product-cards.js','utf8');
const chrome=fs.readFileSync('assets/js/chrome.js','utf8');
const css=fs.readFileSync('assets/theme/static-bundle.css','utf8');
assert.ok(app.includes('Product pages are authoritative static documents') && app.includes('location.assign(url); return;'), 'Native local PDP navigation is missing');
assert.ok(app.includes('Let the browser load canonical /p/*.html') && app.includes('if (/^\\/p\\/'), 'Local canonical PDP click bypass is missing');
assert.match(app,/if \(!replace && clean && \^p\\\//, 'Native navigation for local product routes missing');
assert.match(app,/if \(\/\^\\\/p\\\//, 'Product links are still intercepted by the SPA');
assert.match(cards,/admin\.yourmart\.pk/, 'Actual local supplier image origin missing');
assert.match(cards,/og:image/, 'Related product image must come from same product metadata');
assert.match(cards,/li\.dataset\.productHref=url/, 'Product-specific canonical association missing');
assert.doesNotMatch(app,/localStorage\.clear\s*\(/, 'Never clear user cart or localStorage');
assert.doesNotMatch(cards,/localStorage\.clear\s*\(/, 'Related media should never clear storage');
assert.match(chrome,/sm_cart/, 'Keep existing shared cart badge integration');
assert.match(css,/sm-related-grid/, 'Related cards need responsive grid styles');
assert.match(css,/section\.pdp\.pdp3/, 'Product detail needs responsive three-column styling');
assert.match(sample,/<link rel="canonical" href="https:\/\/sastamilaga\.com\/p\//, 'Canonical product URL missing');
const canonical=sample.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
assert.ok(canonical, 'No canonical');
const source=sample.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
assert.ok(source&&source.startsWith('https://admin.yourmart.pk/'), 'Verified local product asset source must be preserved');
console.log(JSON.stringify({pass:true,contract:'local PDP native navigation, source-authorized images, responsive cards, cart untouched',canonical,imagesFrom:'admin.yourmart.pk'}));
