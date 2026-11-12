/* Inserts assets/theme/footer-v2.css (idempotently, between markers) at the end of styles.css (app pages) and
   assets/theme/static-bundle.css (product, category and blog pages), so the footer looks the same everywhere.
   Run: node tools/apply-footer-css.mjs */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/theme/footer-v2.css'), 'utf8').trim();
for (const f of ['styles.css', 'assets/theme/static-bundle.css']) {
  const p = path.join(ROOT, f); let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/\n?\/\*footer-v2:start\*\/[\s\S]*?\/\*footer-v2:end\*\//, '');
  fs.writeFileSync(p, c.replace(/\s*$/, '\n') + '/*footer-v2:start*/\n' + css + '\n/*footer-v2:end*/\n');
  console.log('updated', f);
}
