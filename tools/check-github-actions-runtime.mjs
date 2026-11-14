#!/usr/bin/env node
/**
 * CI policy for Node 24 GitHub-owned JavaScript actions.
 * Distinguishes action's runs.using runtime from build step node-version.
 * No dependency or network access: validates every workflow in repository.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.github/workflows');
const minMajor={
 'actions/checkout':7,
 'actions/setup-node':7,
 'actions/upload-artifact':7,
 'actions/configure-pages':6,
 'actions/upload-pages-artifact':5,
 'actions/deploy-pages':5
};
const workflows=fs.readdirSync(root).filter(x=>/\.ya?ml$/.test(x)).sort();
if(workflows.length<21)throw new Error('Workflow inventory incomplete');
const failures=[],counts={};
for(const name of workflows){
 const data=fs.readFileSync(path.join(root,name),'utf8');
 let actionsFound=0;
 for(const line of data.split(/\r?\n/)){
  const m=line.match(/^\s*(?:-\s*)?uses:\s*(actions\/[A-Za-z0-9_-]+)@([^\s#]+)/);
  if(!m)continue;
  actionsFound++;
  const [_,action,version]=m;
  counts[action]=(counts[action]||0)+1;
  const major=Number(version.match(/^v([0-9]+)(?:[.-].*)?$/)?.[1]);
  if(!Number.isInteger(major)||major<(minMajor[action]??Infinity))
    failures.push(name+': unsupported or unverified runtime '+action+'@'+version);
 }
 if(actionsFound===0)failures.push(name+': no checked first-party action (confirm explicitly)');
 if(name==='workers.yml'){
  if(data.includes('".github/workflows/workers.yml"]'))
    failures.push('workers.yml self-change would redeploy Cloudflare Workers');
  if(/^\s*attach\s+"sastamilaga\.com\/global\/p\/\*"\s+sastamilaga-global-pages\s*$/m.test(data)&&!data.includes('legacy_present'))
    failures.push('workers.yml may overwrite live /global/p/* recovery route');
 }
}
console.log(JSON.stringify({workflows_checked:workflows.length,action_occurrences:counts,failures},null,2));
if(failures.length)process.exitCode=1;
