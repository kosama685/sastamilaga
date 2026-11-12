/* Machine-translates the fixed interface strings (data/i18n/mt/fr.json holds the English source keys) into every language the
   Cloudflare Workers AI model @cf/meta/m2m100-1.2b supports. Run by .github/workflows/translate-i18n.yml.
   - Only strings that are missing in data/i18n/mt/<lang>.json are translated (a re-run costs nothing when nothing changed).
   - Every file is marked machine-translated and NOT reviewed by a person. Nothing here creates pages, hreflang or sitemap entries.
   - English and Urdu are the site's own reviewed languages and are never overwritten. */
import fs from 'node:fs';
import path from 'node:path';

const ACC = process.env.CF_ACCOUNT_ID, TOKEN = process.env.CF_API_TOKEN;
if (!ACC || !TOKEN) { console.error('CF_ACCOUNT_ID / CF_API_TOKEN missing'); process.exit(1); }
const DIR = 'data/i18n/mt';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const CODES = 'af am ar ast az ba be bg bn br bs ca ceb cs cy da de el es et fa ff fi fr fy ga gd gl gu ha he hi hr ht hu hy id ig ilo is it ja jv ka kk km kn ko lb lg ln lo lt lv mg mk ml mn mr ms my ne nl no ns oc or pa pl ps pt ro ru sd si sk sl so sq sr ss su sv sw ta th tl tn tr uk uz vi wo xh yi yo zh zu'.split(' ');
const RTL = new Set(['ar', 'fa', 'ps', 'sd', 'he', 'yi', 'ur']);
const NAME_FIX = { ht: 'haitian', ns: 'northern sotho', ceb: 'cebuano', ff: 'fulah', ilo: 'iloko', no: 'norwegian', ast: 'asturian', ba: 'bashkir', lb: 'luxembourgish', ln: 'lingala', lg: 'ganda', or: 'oriya', ss: 'swati', tl: 'tagalog', tn: 'tswana', wo: 'wolof', yi: 'yiddish', zh: 'chinese', jv: 'javanese', su: 'sundanese', gd: 'scottish gaelic', oc: 'occitan', mg: 'malagasy', fy: 'western frisian', my: 'burmese' };
const en = new Intl.DisplayNames(['en'], { type: 'language' });
const nameOf = c => NAME_FIX[c] || String(en.of(c)).toLowerCase();
const native = c => { try { return new Intl.DisplayNames([c], { type: 'language' }).of(c) || c; } catch { return c; } };

const source = Object.keys(JSON.parse(fs.readFileSync(path.join(DIR, 'fr.json'), 'utf8')).strings);
console.log(`source strings: ${source.length}, languages: ${CODES.length}`);

async function tr(text, lang) {
  for (let a = 0; a < 3; a++) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACC}/ai/run/@cf/meta/m2m100-1.2b`, {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_lang: 'english', target_lang: nameOf(lang) })
    });
    if (r.status === 429) { await new Promise(s => setTimeout(s, 4000 * (a + 1))); continue; }
    const j = await r.json().catch(() => null);
    if (j && j.success && j.result && j.result.translated_text) return String(j.result.translated_text).trim();
    if (a === 2) throw new Error((j && j.errors && j.errors[0] && j.errors[0].message) || `HTTP ${r.status}`);
  }
}

const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
let spent = 0, failed = [];
for (const lang of CODES) {
  if (ONLY.length && !ONLY.includes(lang)) continue;
  const file = path.join(DIR, `${lang}.json`);
  const cur = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { lang, status: 'machine-translated', reviewed_by_human: false, dir: RTL.has(lang) ? 'rtl' : 'ltr', native: native(lang), strings: {} };
  if (cur.reviewed_by_human) continue;   // never overwrite a reviewed file
  const todo = source.filter(k => !cur.strings[k]);
  if (!todo.length) continue;
  try {
    for (let i = 0; i < todo.length; i += 5) {
      const part = await Promise.all(todo.slice(i, i + 5).map(k => tr(k, lang)));
      todo.slice(i, i + 5).forEach((k, n) => { if (part[n]) cur.strings[k] = part[n]; });
      spent += part.length;
    }
  } catch (e) { failed.push(`${lang}: ${e.message}`); }
  if (Object.keys(cur.strings).length) {
    fs.writeFileSync(file, JSON.stringify({ lang: cur.lang, status: 'machine-translated', reviewed_by_human: false, dir: cur.dir, native: cur.native, strings: cur.strings }, null, 0).replace(/,"strings"/, ',\n"strings"'));
    if (!index.languages.some(l => l.code === lang)) index.languages.push({ code: lang, native: cur.native, dir: cur.dir });
  }
  console.log(`${lang}: ${Object.keys(cur.strings).length}/${source.length}`);
}
fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
console.log(`translated this run: ${spent}; failed languages: ${failed.length}`);
failed.forEach(f => console.log('FAILED ' + f));
