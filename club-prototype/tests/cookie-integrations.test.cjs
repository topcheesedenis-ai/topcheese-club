const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { createConsentManager } = require('../cookie-consent.js');
const code = fs.readFileSync(path.join(__dirname, '../cookie-integrations.js'), 'utf8');

const disabledChoice = JSON.stringify({ version: 1, necessary: true, analytics: false, marketing: false });
function setup(saved = disabledChoice) {
  let stored = saved;
  let reloads = 0;
  const scripts = [];
  const calls = [];
  const manager = createConsentManager({
    storage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
    reload: () => reloads++,
  });
  const window = { ClubCookieConsent: manager, location: { href: 'https://example.test/club/' } };
  const document = {
    scripts, referrer: 'https://example.test/',
    createElement() {
      const handlers = [];
      return {
        addEventListener(_, handler, options) { handlers.push({ handler, options }); },
        load() { for (const { handler, options } of handlers) if (!options.signal.aborted) handler(); },
        remove() { const i = scripts.indexOf(this); if (i >= 0) scripts.splice(i, 1); },
      };
    },
    head: { appendChild: script => scripts.push(script) },
  };
  vm.runInNewContext(code, { window, document });
  return { manager, window, scripts, calls, stored: () => stored, reloads: () => reloads,
    load() { window.ym = (...args) => calls.push(args); scripts[0].load(); } };
}

test('saved necessary-only and marketing-only create no Metrika script or global', () => {
  const h = setup();
  h.manager.save({});
  h.manager.save({ marketing: true });
  assert.equal(h.scripts.length, 0);
  assert.equal(h.window.ym, undefined);
});
test('new visitors load Metrika by default and accepting does not initialize it again', () => {
  const h = setup(null);
  assert.equal(h.manager.hasChoice(), false);
  assert.equal(h.scripts.length, 1);
  h.load(); h.manager.save({ analytics: true, marketing: true });
  assert.equal(h.scripts.length, 1);
  assert.equal(h.calls.length, 1);
});
test('analytics loads the exact supplied counter once, with every supplied option', () => {
  const h = setup(); h.manager.save({ analytics: true });
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].src, 'https://mc.yandex.ru/metrika/tag.js?id=112548973');
  assert.equal(h.scripts[0].async, true);
  h.load(); h.manager.save({ analytics: true, marketing: true });
  assert.equal(h.scripts.length, 1); assert.equal(h.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])), [112548973, 'init', {
    ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer',
    referrer: 'https://example.test/', url: 'https://example.test/club/',
    accurateTrackBounce: true, trackLinks: true,
  }]);
});
test('saved analytics consent starts on the next document', () => {
  const h = setup(); h.manager.save({ analytics: true });
  const next = setup(h.stored()); assert.equal(next.scripts.length, 1);
  next.load(); assert.equal(next.calls[0][1], 'init');
});
test('revocation before load prevents a late initialization', () => {
  const h = setup(); h.manager.save({ analytics: true });
  const pending = h.scripts[0];
  h.manager.save({}); pending.load();
  assert.equal(h.scripts.length, 0); assert.equal(h.reloads(), 1);
  assert.equal(h.window.ym.a, undefined);
  assert.equal(setup(h.stored()).scripts.length, 0);
});
test('revocation after initialization calls destruct and reloads without Metrika', () => {
  const h = setup(); h.manager.save({ analytics: true }); h.load();
  h.manager.save({ marketing: true });
  assert.deepEqual(h.calls[1], [112548973, 'destruct']);
  assert.equal(h.scripts.length, 0); assert.equal(h.reloads(), 1);
  assert.equal(setup(h.stored()).scripts.length, 0);
});
test('missing consent manager fails closed', () => {
  const window = {};
  vm.runInNewContext(code, { window });
  assert.equal(window.ym, undefined);
});

test('revocation preserves the live Yandex queue hook so destruct reaches the library', () => {
  const h = setup(); h.manager.save({ analytics: true });
  const commands = [];
  const queue = h.window.ym.a = [];
  queue.push = function (...items) {
    commands.push(...items.map(call => call[1]));
    return Array.prototype.push.apply(this, items);
  };
  h.scripts[0].load();
  h.manager.save({});
  assert.equal(h.window.ym.a, queue);
  assert.deepEqual(commands, ['init', 'destruct']);
});
