# Languages (start of the 104-language programme)

`languages.json` lists the 104 target languages with native names and text direction. Only **English** and **Urdu** are live, both written and reviewed by people.
No other language is published, because a machine translation is not shown to customers without a human review.

How a language goes live:
1. A translator fills the `translation` column of `source-strings-en.csv` (header and footer text) and translates the page texts (about, FAQ, how to order, shipping, returns, privacy, terms, contact).
2. A second person reviews it and the reviewer and date are recorded in the CSV.
3. The language is switched to `live` in `languages.json`, its pages are published under `/<code>/…` with `hreflang` pairs (as `/ur/…` already does), and it is added to the sitemap.
4. Product titles and descriptions follow, category by category, starting with the languages that have the most customers.

This keeps wrong or embarrassing translations off the site and keeps Google's language versions consistent.

## Machine-translated interface (15 languages)

`mt/<code>.json` holds 75 interface strings (menus, header, footer, buttons) for ar, hi, bn, fr, es, de, tr, id, fa, ps, sd, pa, ru, zh and pt.
They are machine translations and have **not** been reviewed by a person (`"reviewed_by_human": false`).

- `assets/js/i18n.js` applies them only when the visitor picks that language in the country/language chooser. Only exact interface strings are replaced; product text, prices and legal pages are not.
- A notice in the visitor's language says the text is machine-translated and offers "Show in English".
- No `/<code>/` pages, no hreflang and no sitemap entries are created for these languages: those stay reserved for reviewed languages (en, ur).
- To promote a language: have a person review its file, set `reviewed_by_human` to true, then follow steps 1 to 4 above.
