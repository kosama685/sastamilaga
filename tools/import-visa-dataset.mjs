#!/usr/bin/env node
/**
 * Imports the Pakistani-passport column of the public passport-index dataset (MIT licence,
 * https://github.com/ilyankou/passport-index-dataset) into data/visa/pk-requirements.json.
 * The dataset is community-maintained; its last data update is recorded so every page can say how old the status is.
 * Usage: node tools/import-visa-dataset.mjs [path/to/passport-index-tidy-iso2.csv]   (downloads the file when no path is given)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso2.csv';
const DATA_DATE = '2025-01-12';   // date of the dataset's last data commit ("Update 12 January 2025"); update when re-importing newer data

const text = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await (await fetch(SRC)).text();
const req = {};
for (const line of text.split(/\r?\n/).slice(1)) {
  const [passport, dest, value] = line.split(',');
  if (passport !== 'PK' || !dest || !value || value === '-1') continue;
  req[dest] = value.trim();
}
const out = {source: 'passport-index-dataset by Ilya Ilyankou (MIT licence)', sourceUrl: 'https://github.com/ilyankou/passport-index-dataset', passport: 'PK',
  dataDate: DATA_DATE, importedOn: new Date().toISOString().slice(0, 10), count: Object.keys(req).length, requirements: req};
fs.mkdirSync(path.join(root, 'data/visa'), {recursive: true});
fs.writeFileSync(path.join(root, 'data/visa/pk-requirements.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({destinations: out.count, dataDate: DATA_DATE}));
