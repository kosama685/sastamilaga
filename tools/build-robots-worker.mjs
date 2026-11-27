#!/usr/bin/env node
// Single source of truth for the canonical /robots.txt Worker, generated in CI.
import fs from 'node:fs';
const policy=fs.readFileSync('robots.txt','utf8').replace(/\r\n/g,'\n').trimEnd()+'\n';
if(!policy.includes('User-agent: *')||!policy.includes('Sitemap: https://sastamilaga.com/sitemap.xml'))throw Error('Invalid robots policy');
if(policy.includes('Disallow: /wp-json/')||policy.includes('Disallow: /api/'))throw Error('Do not block public rendering dependencies');
const source=[
  'const POLICY='+JSON.stringify(policy)+';',
  'export default {',
  '  async fetch(req) {',
  '    if(!["GET","HEAD"].includes(req.method))return new Response(null,{status:405,headers:{Allow:"GET, HEAD"}});',
  '    if(new URL(req.url).pathname!=="/robots.txt")return new Response("Not found",{status:404});',
  '    return new Response(req.method==="HEAD"?null:POLICY,{status:200,headers:{',
  '      "Content-Type":"text/plain; charset=utf-8",',
  '      "Cache-Control":"public,max-age=300,s-maxage=300",',
  '      "X-Content-Type-Options":"nosniff",',
  '      "X-Sasta-Robots-Source":"github-main"',
  '    }});',
  '  }',
  '};'
].join('\n')+'\n';
fs.mkdirSync('.tmp',{recursive:true});
fs.writeFileSync('.tmp/sasta-robots-policy.mjs',source);
console.log('Generated exact-path robots Worker from repository robots.txt:',policy.length,'bytes');
