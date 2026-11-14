#!/usr/bin/env node
/**
 * Small runtime header/footer payload from canonical chrome.json.
 * The static app shell keeps its full source, but category/product/blog pages
 * load only keys actually consumed by assets/js/chrome.js.
 * The build is deterministic, idempotent and does not modify commerce data.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.join(root,'partials/chrome.json');
const output=path.join(root,'partials/chrome-runtime.json');
const original=JSON.parse(fs.readFileSync(input,'utf8'));
for(const key of ['header','footer','boot','smh']){
 if(typeof original[key]!=='string'||original[key].length<40)throw Error('Missing canonical chrome field: '+key);
}
const runtime={header:original.header,footer:original.footer,boot:original.boot,smh:original.smh};
const serialized=JSON.stringify(runtime)+'\n';
const current=fs.existsSync(output)?fs.readFileSync(output,'utf8'):'';
if(process.argv.includes('--check')){
 if(current!==serialized)throw Error('Runtime chrome payload is missing or out of date');
 console.log(JSON.stringify({check:'passed',bytes:Buffer.byteLength(serialized),sourceBytes:fs.statSync(input).size,keys:Object.keys(runtime)}));
}else{
 if(current!==serialized)fs.writeFileSync(output,serialized);
 console.log(JSON.stringify({created:current!==serialized,bytes:Buffer.byteLength(serialized),sourceBytes:fs.statSync(input).size,keys:Object.keys(runtime)}));
}
