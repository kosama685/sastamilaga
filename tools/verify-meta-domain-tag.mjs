import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Guard Meta Business Manager domain verification: the tag must be in static
// HTML sent with the initial response, never inserted by a client script.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tag = '<meta name="facebook-domain-verification" content="ja14rskqm8xo4pj7gf346r12yskn4d" />';
const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1];
assert.ok(head, 'homepage must have a static <head>');
assert.ok(head.includes(tag), 'Meta verification tag missing from homepage <head>');
assert.equal((html.match(/<meta\b[^>]*\bname=["']facebook-domain-verification["'][^>]*>/gi) || []).length, 1, 'exactly one Meta domain verification tag is required');
assert.equal(html.slice(html.indexOf('</head>')).includes(tag), false, 'Meta tag must not appear outside the head');
console.log('PASS: static Meta verification tag exists exactly once inside homepage head.');
