import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={URL,Promise,setTimeout,clearTimeout,globalThis:{}};
vm.runInNewContext(fs.readFileSync('assets/js/live-tv-core.js','utf8'),ctx);
const diagnose=ctx.globalThis.SLTVCore?.diagnose;
test('classification distinguishes HTTP access denial, missing segments and upstream failures',()=>{
  assert.equal(diagnose('manifest load failed',403).code,'ACCESS_DENIED');
  assert.equal(diagnose('segment unavailable',404).code,'SOURCE_MISSING');
  assert.equal(diagnose('server failure',502).code,'UPSTREAM_ERROR');
});
test('cannot mislabel generic network failure as proven CORS',()=>{
  const a=diagnose('manifestLoadError');
  assert.equal(a.code,'NETWORK_OR_CORS');
  assert.match(a.summary,/one possibility/i);
});
test('DRM, codecs and stalls have distinct recovery guidance',()=>{
  assert.equal(diagnose('Widevine DRM license error').code,'DRM_ENTITLEMENT');
  assert.equal(diagnose('media decode error').code,'CODEC_UNSUPPORTED');
  assert.equal(diagnose('Playback stalled').code,'STALL_OR_TIMEOUT');
});
