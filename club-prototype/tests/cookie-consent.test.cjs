const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConsentManager, KEY } = require('../cookie-consent.js');

const disabledChoice = JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false });
function harness(raw = disabledChoice) {
  let stored = raw;
  const log = [];
  const storage = { getItem: () => stored, setItem: (key, value) => {
    assert.equal(key, KEY); stored = value;
  } };
  const manager = createConsentManager({ storage, reload: () => log.push('reload') });
  for (const category of ['analytics', 'marketing']) {
    manager.register({ id: category, category, start({ signal }) {
      log.push(`start:${category}`);
      signal.addEventListener('abort', () => log.push(`abort:${category}`));
      return () => log.push(`stop:${category}`);
    } });
  }
  return { manager, log, stored: () => stored, storage, replace: value => { stored = value; } };
}

test('without a valid saved choice both categories use the enabled site defaults', () => {
  for (const raw of [null, 'broken', '{}', '{"version":0,"analytics":true,"marketing":true}',
    '{"version":1,"necessary":true,"analytics":"true","marketing":true}']) {
    const { manager, log } = harness(raw);
    assert.equal(manager.hasChoice(), false);
    assert.equal(manager.isAllowed('analytics'), true);
    assert.equal(manager.isAllowed('marketing'), true);
    assert.deepEqual(log, ['start:analytics', 'start:marketing']);
  }
});
test('accepting defaults does not restart integrations; opting out survives reload', () => {
  const h = harness(null);
  assert.equal(h.manager.hasChoice(), false);
  h.manager.save({ analytics: true, marketing: true });
  assert.deepEqual(h.log, ['start:analytics', 'start:marketing']);
  h.manager.save({});
  assert.deepEqual(h.log.slice(2), ['abort:analytics', 'stop:analytics', 'abort:marketing', 'stop:marketing', 'reload']);
  const next = harness(h.stored());
  assert.equal(next.manager.hasChoice(), true);
  assert.deepEqual(next.log, []);
});
test('save necessary-only survives a fresh page; no optional integration starts', () => {
  const h = harness();
  assert.equal(h.manager.save({}), true);
  assert.deepEqual(h.log, []);
  const next = harness(h.stored());
  assert.equal(next.manager.hasChoice(), true);
  assert.deepEqual(next.log, []);
});
test('independent permissions, accept all, and repeated saves start each integration once', () => {
  const h = harness();
  h.manager.save({ analytics: true });
  assert.deepEqual(h.log, ['start:analytics']);
  h.manager.save({ analytics: true, marketing: true });
  h.manager.save({ analytics: true, marketing: true });
  assert.deepEqual(h.log, ['start:analytics', 'start:marketing']);
  const next = harness(h.stored());
  assert.deepEqual(next.log, ['start:analytics', 'start:marketing']);
});
test('marketing can be granted without analytics', () => {
  const h = harness(); h.manager.save({ marketing: true });
  assert.deepEqual(h.log, ['start:marketing']);
});
test('revocation persists first, aborts and cleans up, then reloads', () => {
  const h = harness(); h.manager.save({ analytics: true, marketing: true });
  h.log.length = 0;
  h.manager.save({ analytics: true });
  assert.equal(JSON.parse(h.stored()).marketing, false);
  assert.deepEqual(h.log, ['abort:marketing', 'stop:marketing', 'reload']);
  assert.deepEqual(harness(h.stored()).log, ['start:analytics']);
});
test('cross-tab saved opt-out withdraws optional consent', () => {
  const h = harness(); h.manager.save({ analytics: true }); h.log.length = 0;
  h.replace(disabledChoice); h.manager.sync();
  assert.equal(h.manager.hasChoice(), true);
  assert.deepEqual(h.log, ['abort:analytics', 'stop:analytics', 'reload']);
});
test('late registration observes current consent and rejects invalid categories/duplicates', () => {
  const h = harness(); h.manager.save({ analytics: true });
  h.manager.register({ id: 'late', category: 'analytics', start: () => h.log.push('late') });
  assert.equal(h.log.at(-1), 'late');
  assert.throws(() => h.manager.register({ id: 'late', category: 'analytics', start() {} }));
  assert.throws(() => h.manager.register({ id: 'typo', category: 'analytcs', start() {} }));
  assert.equal(h.manager.isAllowed('analytcs'), false);
});
test('unavailable storage uses the defaults but never pretends a choice was saved', () => {
  const errors = []; let started = false;
  const manager = createConsentManager({
    storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } },
    reload() {}, onError: e => errors.push(e),
  });
  manager.register({ id: 'test', category: 'analytics', start() { started = true; } });
  assert.equal(manager.save({ analytics: true }), false);
  assert.equal(manager.hasChoice(), false);
  assert.equal(started, true);
  assert.equal(errors.length, 1);
});
test('one broken integration does not prevent other permitted integrations from loading', () => {
  const h = harness();
  h.manager.register({ id: 'broken', category: 'analytics', start() { throw Error('vendor'); } });
  h.manager.save({ analytics: true, marketing: true });
  assert.deepEqual(h.log, ['start:analytics', 'start:marketing']);
});
