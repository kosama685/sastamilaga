#!/usr/bin/env node
// SFTP publishing of an explicitly approved retail feed. No credentials in source/logs.
// Never call with raw CJ supplier XML or the local unverified candidate feed.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const local=path.resolve('feeds/merchant-verified.xml');
const reportFile=path.resolve('artifacts/merchant-verified-report.json');
const remote=process.env.GMC_SFTP_FILENAME||'';
const user=process.env.GMC_SFTP_USERNAME||'';
const password=process.env.GMC_SFTP_PASSWORD||'';
const approval=process.env.GMC_RELEASE_SHA256||'';
const expectedHost='partnerupload.google.com';
const expectedPort=19321;
const expectedMD5='85:19:8a:fb:60:4b:94:13:5c:ea:fe:3b:99:c7:a5:4d';
const expectedSHA256='+0f4WhxwRkG/WX0UJV9o1GunRcTzFA9en76QzIVVOPY';
function must(ok,message){if(!ok)throw Error(message)}
async function sha256(file){
 const hasher=crypto.createHash('sha256');
 for await(const chunk of fs.createReadStream(file))hasher.update(chunk);
 return hasher.digest('hex');
}
function verifyServerKey(key){
 const raw=Buffer.isBuffer(key)?key:Buffer.from(key);
 const md5=crypto.createHash('md5').update(raw).digest('hex').match(/.{2}/g).join(':');
 const sha=crypto.createHash('sha256').update(raw).digest('base64').replace(/=+$/,'');
 return md5===expectedMD5&&sha===expectedSHA256;
}
must(process.env.GMC_PUBLISH_APPROVED==='true','Publishing remains disabled without explicit operator release');
must(process.env.GMC_SFTP_HOST===expectedHost&&Number(process.env.GMC_SFTP_PORT)===expectedPort,'Google Merchant SFTP endpoint must match official details');
must(user&&password,'Missing rotated Google SFTP credentials in GitHub Actions Secrets');
must(/^[A-Za-z0-9_.-]+\.(xml|txt|tsv)(\.gz)?$/.test(remote),'Set the exact filename registered for this Merchant Center source');
must(/^[a-f0-9]{64}$/.test(approval),'Missing exact approved feed SHA-256 digest');
must(fs.existsSync(local)&&fs.existsSync(reportFile),'Verified retail export and report are required');
const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
const size=fs.statSync(local).size;
must(size>0&&size<4*1024**3,'Feed missing or greater than Google SFTP 4GB limit');
must(report.stats?.eligible>0&&report.stats?.read===report.stats?.eligible+report.stats?.excluded,'Invalid eligibility report');
must(report.merchantApproval==='NOT_CLAIMED','Invalid or unexpected release report');
const digest=await sha256(local);
must(digest===report.sha256&&digest===approval,'Feed has not been independently approved or changed since approval');
const Sftp=(await import('ssh2-sftp-client')).default;
const client=new Sftp();
try{
 await client.connect({
  host:expectedHost,port:expectedPort,username:user,password,
  hostVerifier:verifyServerKey,
  readyTimeout:25000,retries:1,
 });
 // Exact registered source filename, relative to SFTP home. Never timestamp it.
 await client.put(local,remote);
 console.log(JSON.stringify({result:'uploaded_to_google_sftp',filename:remote,bytes:size,sha256:digest,items:report.stats.eligible,
  note:'Upload confirmation is not Merchant approval. Check processing and diagnostics in Merchant Center.'}));
}finally{
 try{await client.end()}catch{}
}
