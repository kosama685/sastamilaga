# Languages (start of the 104-language programme)

`languages.json` lists the 104 target languages with native names and text direction. Only **English** and **Urdu** are live, both written and reviewed by people.
No other language is published, because a machine translation is not shown to customers without a human review.

How a language goes live:
1. A translator fills the `translation` column of `source-strings-en.csv` (header and footer text) and translates the page texts (about, FAQ, how to order, shipping, returns, privacy, terms, contact).
2. A second person reviews it and the reviewer and date are recorded in the CSV.
3. The language is switched to `live` in `languages.json`, its pages are published under `/<code>/…` with `hreflang` pairs (as `/ur/…` already does), and it is added to the sitemap.
4. Product titles and descriptions follow, category by category, starting with the languages that have the most customers.

This keeps wrong or embarrassing translations off the site and keeps Google's language versions consistent.
