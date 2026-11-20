# Language registry reconciliation (2026-11-20)

The "127" and "128" figures are both correct; they count different things.

| Count | What it is |
|---|---|
| 127 | overlay languages in `data/landing/locale-registry.json` (taken from the translate-overlay list in `shipping/index.html`) |
| +1 = 128 | `reports/language-coverage-127.csv` adds the source language, English, as its own row |

Breakdown of the 127 overlay entries: 125 plain language codes and 2 script variants (`sr-cyrl` Serbian Cyrillic, `zh-hans` Simplified Chinese). No regional locales (such as `de-DE`) are in the overlay list. Landing pages use language tags `en`, `en-GB`, `en-US`, `ur`, `de`, `sr-Latn`, `sr-Cyrl` and `ar`.

Open question, not guessed: the overlay list holds both `sr-cyrl` and (via the page set) a Serbian Latin variant that is not in the overlay list as a separate entry; the registry should be extended with explicit `sr-latn` and with a locale layer (language + country) before country-language routes are generated. This is planned in the route-generator step.
