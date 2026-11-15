import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/theme/cj-storefront.css',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../assets/js/cj-storefront.js',import.meta.url),'utf8');
fs.writeFileSync(new URL('../edge/cj-assets.mjs',import.meta.url),'// Generated from the existing assets structure. No credentials.\nexport const css='+JSON.stringify(css)+';\nexport const client='+JSON.stringify(client)+';\n');
console.log(JSON.stringify({css_bytes:Buffer.byteLength(css),client_bytes:Buffer.byteLength(client)}));
