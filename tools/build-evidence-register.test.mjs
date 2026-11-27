import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED, missingFields, qualifies, buildRegister} from './build-evidence-register.mjs';

const full = Object.fromEntries(REQUIRED.map(k => [k, 'x']));
Object.assign(full, {verificationDate: '2026-11-20', approvalStatus: 'approved'});

test('a record qualifies only when every required field is present, dated correctly and approved', () => {
  assert.equal(qualifies(full), true);
  for (const k of REQUIRED) assert.equal(qualifies({...full, [k]: ''}), false, k);
  assert.equal(qualifies({...full, verificationDate: 'soon'}), false);
  assert.equal(qualifies({...full, approvalStatus: 'pending'}), false);
  assert.equal(qualifies({}), false);
});
test('missingFields names the gaps', () => {
  assert.deepEqual(missingFields({carrier: 'DHL'}).includes('carrier'), false);
  assert.ok(missingFields({carrier: 'DHL'}).includes('paymentTestResult'));
});
test('register covers all 246 registry countries and, with no evidence file entries, qualifies none', () => {
  const {rows, records} = buildRegister();
  assert.equal(rows.length, 246);
  assert.equal(new Set(rows.map(r => r[0])).size, 246);
  if (!Object.keys(records).length) assert.ok(rows.every(r => r[r.length - 1] === 'no'));
});
