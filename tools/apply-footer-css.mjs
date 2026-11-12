/* Inserts assets/theme/footer-v2.css (idempotently, between markers) at the end of styles.css (app pages) and
   assets/theme/static-bundle.css (product, category and blog pages), so the footer looks the same everywhere.
   Run: node tools/apply-footer-css.mjs */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const layers = [['footer-v2', ['styles.css', 'assets/theme/static-bundle.css']], ['checkout-v2', ['styles.css']], ['pdp-v2', ['styles.css', 'assets/theme/static-bundle.css']]];
for (const [name, files] of layers) {
  const css = fs.readFileSync(path.join(ROOT, `assets/theme/${name}.css`), 'utf8').trim(), re = new RegExp(`\\n?\\/\\*${name}:start\\*\\/[\\s\\S]*?\\/\\*${name}:end\\*\\/`);
  for (const f of files) {
    const p = path.join(ROOT, f); let c = fs.readFileSync(p, 'utf8').replace(re, '');
    fs.writeFileSync(p, c.replace(/\s*$/, '\n') + `/*${name}:start*/\n` + css + `\n/*${name}:end*/\n`);
    console.log('updated', name, '->', f);
  }
}
