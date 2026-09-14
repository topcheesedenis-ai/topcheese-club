// Run with Playwright on NODE_PATH and the local preview on port 8791.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.CLUB_TEST_URL || 'http://localhost:8791/club-prototype/';
const accessGoal = 'club_nazhal_poluchit_dostup';
const planGoal = 'club_vybral_tarif';

async function setup(browser, { mobile = false, analytics = true, blocked = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: mobile ? 390 : 1440, height: 900 }, hasTouch: mobile,
    reducedMotion: 'reduce',
  });
  await page.route('https://mc.yandex.ru/**', route => blocked ? route.abort() : route.fulfill({
    contentType: 'text/javascript',
    body: 'window.ym = (...args) => window.goalTrace.push({ kind: "ym", args });',
  }));
  // Keep the real widget-loading code, but do not contact a checkout in regression tests.
  await page.route('https://academy.topcheese.online/**', route => route.fulfill({
    contentType: 'text/javascript', body: '',
  }));
  await page.addInitScript(({ analytics }) => {
    localStorage.setItem('topcheese.cookie-consent', JSON.stringify({
      version: 1, necessary: true, analytics, marketing: false,
    }));
    window.goalTrace = [];
    for (const [plan, id] of Object.entries({
      month: 'bef41d450f0b2e4024017ba236ec0881c80ffbf7',
      year: '1070c238acc85374e6b33ab9a01978184aa73c74',
    })) document.addEventListener(`StartWidget${id}`, () => window.goalTrace.push({ kind: 'widget', plan }));
  }, { analytics });
  await page.goto(url);
  return page;
}

const goals = page => page.evaluate(() => window.goalTrace
  .filter(entry => entry.kind === 'ym' && entry.args[1] === 'reachGoal').map(entry => entry.args));
const close = page => page.locator('.gc-popup__close').click();

test('three access buttons send one common goal per real activation, including mobile tap and keyboard', async () => {
  const browser = await chromium.launch();
  try {
    const page = await setup(browser);
    assert.deepEqual(await goals(page), []);
    for (const selector of ['.hero [data-gc-popup-open]', '[data-cta="club_cta_bottom"]']) {
      await page.locator(selector).click();
      assert.equal(await page.locator('[data-gc-popup]').getAttribute('aria-hidden'), 'false');
      await close(page);
    }
    assert.deepEqual(await goals(page), Array.from({ length: 2 }, () => [112548973, 'reachGoal', accessGoal, {}]));
    // Programmatic UI activation must not manufacture a conversion.
    await page.locator('.hero [data-gc-popup-open]').evaluate(button => button.click());
    await close(page);
    assert.equal((await goals(page)).length, 2);
    await page.locator('.hero [data-gc-popup-open]').focus();
    await page.keyboard.press('Enter');
    await close(page);
    assert.equal((await goals(page)).length, 3);
    assert.equal(await page.evaluate(() => window.goalTrace.filter(e => e.kind === 'ym' && e.args[1] === 'init').length), 1);
    await page.close();

    const mobile = await setup(browser, { mobile: true });
    await mobile.locator('#questions').scrollIntoViewIfNeeded();
    await mobile.locator('[data-sticky-cta].sticky-cta--visible').waitFor();
    await mobile.locator('.sticky-cta__button').tap();
    assert.deepEqual(await goals(mobile), [[112548973, 'reachGoal', accessGoal, {}]]);
    await close(mobile);
    await mobile.close();
  } finally { await browser.close(); }
});

test('each selected plan sends its exact parameter before the GetCourse widget starts', async () => {
  const browser = await chromium.launch();
  try {
    const page = await setup(browser);
    await page.locator('.hero [data-gc-popup-open]').click();
    for (const [plan, tarif] of [['month', 'mesyats'], ['year', 'god']]) {
      await page.locator(`[data-plan-button][data-plan="${plan}"]`).click();
      await page.waitForFunction(plan => window.goalTrace.some(e => e.kind === 'widget' && e.plan === plan), plan);
      assert.equal(await page.locator(`[data-gc-widget="${plan}"]`).isVisible(), true);
      const trace = await page.evaluate(() => window.goalTrace);
      const sent = trace.findIndex(e => e.kind === 'ym' && e.args[2] === planGoal && e.args[3]?.tarif === tarif);
      const started = trace.findIndex(e => e.kind === 'widget' && e.plan === plan);
      assert.ok(sent >= 0 && sent < started, 'goal precedes the selected widget start');
      await page.locator('[data-gc-popup-back]').click();
    }
    assert.deepEqual(await goals(page), [
      [112548973, 'reachGoal', accessGoal, {}],
      [112548973, 'reachGoal', planGoal, { tarif: 'mesyats' }],
      [112548973, 'reachGoal', planGoal, { tarif: 'god' }],
    ]);
    assert.equal(page.url(), url);
    await page.close();
  } finally { await browser.close(); }
});

test('disabled, blocked, missing or throwing Metrika never prevents either GetCourse form from starting', async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ['disabled', 'blocked', 'missing', 'throwing']) {
      const page = await setup(browser, { analytics: mode !== 'disabled', blocked: mode === 'blocked' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (mode === 'disabled') await page.evaluate(() => {
        window.ym = (...args) => window.goalTrace.push({ kind: 'ym', args });
      });
      if (mode === 'missing') await page.evaluate(() => { delete window.ym; });
      if (mode === 'throwing') await page.evaluate(() => { window.ym = () => { throw new Error('Metrika unavailable'); }; });
      await page.locator('.hero [data-gc-popup-open]').click();
      for (const plan of ['month', 'year']) {
        await page.locator(`[data-plan-button][data-plan="${plan}"]`).click();
        await page.waitForFunction(plan => window.goalTrace.some(e => e.kind === 'widget' && e.plan === plan), plan);
        assert.equal(await page.locator(`[data-gc-widget="${plan}"]`).isVisible(), true);
        await page.locator('[data-gc-popup-back]').click();
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(await goals(page), []);
      await page.close();
    }
  } finally { await browser.close(); }
});
