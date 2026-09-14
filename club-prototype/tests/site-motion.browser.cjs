// Optional browser regression checks: provide Playwright through NODE_PATH.
// Serve the repository on 8791, or set CLUB_TEST_URL to another local preview.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.CLUB_TEST_URL || 'http://localhost:8791/club-prototype/';

async function pageFor(browser, width, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
  await page.addInitScript(() => localStorage.setItem('topcheese.cookie-consent', JSON.stringify({
    version: 1, necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString()
  })));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

test('seal morph keeps the logo clear of the title and all eight branches connected', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1100, 1440]) {
      const page = await pageFor(browser, width);
      await page.locator('.is-seal-ready').waitFor();
      await page.evaluate(() => {
        window.hubOverlap = false;
        document.querySelector('[data-product-visual]').addEventListener('club-map:reveal', () => {
          const until = performance.now() + 600;
          function frame() {
            const logo = document.querySelector('.cv-root-logo').getBoundingClientRect();
            const title = document.querySelector('.cv-title').getBoundingClientRect();
            window.hubOverlap ||= logo.left < title.right && logo.right > title.left && logo.top < title.bottom && logo.bottom > title.top;
            if (performance.now() < until) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }, { once: true });
      });
      await page.locator('[data-product-intro]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !document.querySelector('.is-morphing'));
      assert.equal(await page.evaluate(() => window.hubOverlap), false);
      const gaps = await page.evaluate(() => {
        const box = document.querySelector('[data-map-tree]').getBoundingClientRect();
        const links = [...document.querySelectorAll('.cv-branch-link')];
        return [...document.querySelectorAll('.cv-stage>.cv-group')].map((group, index) => {
          const icon = group.querySelector('.cv-icon-wrap').getBoundingClientRect();
          const point = links[index].getPointAtLength(links[index].getTotalLength());
          return Math.hypot(point.x + box.left - icon.left - icon.width / 2, point.y + box.top - icon.top);
        });
      });
      assert.equal(gaps.length, 8);
      assert.ok(gaps.every(gap => gap < 1));
      assert.equal(await page.locator('[data-map-tree]').evaluate(node => node.inert), false);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('seven mobile disclosures preserve the exact content and one-open rule', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [360, 390, 430]) {
      const page = await pageFor(browser, width, 'reduce');
      const map = page.locator('.cv-mobile');
      assert.equal(await map.locator('details').count(), 7);
      assert.equal(await map.locator('[data-mobile-section=intro] details').count(), 0);
      for (const [id, count, meta] of [
        ['theory', 20, '20 тем · 3 раздела'], ['cheeses', 6, '6 видеоуроков'],
        ['practice', 3, '3 урока'], ['milk-control', 11, '11 методов'],
        ['equipment', 1, ''], ['legalization', 1, ''], ['sales', 3, '3 подкаста']
      ]) {
        const group = map.locator(`[data-mobile-section="${id}"]`);
        const summary = group.locator(':scope > details > summary');
        assert.ok((await summary.innerText()).includes(meta));
        if (!meta) assert.equal(await summary.locator('.cv-mobile-cue').count(), 0);
        assert.equal(await group.locator('.cv-mobile-body li').count(), count);
        await summary.click();
        assert.equal(await map.locator('details[open]').count(), 1);
        assert.ok(await group.locator('.cv-mobile-body li').first().isVisible());
        if (id === 'equipment') assert.equal(await group.locator('.cv-mobile-topic-meta').innerText(), 'Подкаст · 38 мин 46 сек');
      }
      const official = map.locator('[data-mobile-section="legalization"]');
      assert.deepEqual(await map.locator(':scope > .cv-mobile-group').evaluateAll(nodes => nodes.slice(-3).map(node => node.dataset.mobileSection)), ['equipment', 'legalization', 'sales']);
      assert.equal(await official.locator('.cv-mobile-title').innerText(), 'Официальное оформление сыроварни');
      assert.equal(await official.locator('.cv-mobile-body').isVisible(), false);
      await official.locator('summary').click();
      assert.equal(await official.locator('.cv-mobile-body').innerText(), 'Как открыть сыроварню официально\nПодкаст · 44 мин 16 сек');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator('.site-pending').count(), 0);
      assert.deepEqual(await page.locator('.stat__value').allTextContents(), ['77', '12', '6', 'Лично']);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('fast scroll catches up; changing motion preference restores all content', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await pageFor(browser, 390);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.ok(await page.locator('[data-site-reveal]').count() > 35);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.site-pending').evaluateAll(nodes => nodes.filter(node => {
      const r = node.getBoundingClientRect();
      return !node.hidden && r.height && r.top < innerHeight * .85 && r.bottom > 0;
    }).length), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.site-pending'));
    assert.equal(await page.locator('.site-sheen').count(), 0);
    assert.deepEqual(await page.locator('.stat__value').allTextContents(), ['77', '12', '6', 'Лично']);
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.locator('.cv-mobile').isVisible(), false);
    assert.equal(await page.locator('[data-site-reveal]').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('desktop uses the same motion owner while the seal and graph keep their behavior', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await pageFor(browser, 1440);
    assert.ok(await page.locator('[data-site-reveal]').count() > 35);
    assert.equal(await page.locator('.block .motion-prepared, .numbers-band .motion-prepared').count(), 0);
    assert.equal(await page.locator('script[src*="mobile-motion.js"]').count(), 0);
    const intro = page.locator('[data-product-intro]');
    await intro.focus(); await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    assert.equal(await page.locator('.cv-root').count(), 1);
    assert.equal(await page.locator('.is-morphing').count(), 0);
    assert.equal(await page.locator('.cv-root').evaluate(node => getComputedStyle(node).transform), 'none');
    const groups = page.locator('.cv-stage > .cv-group');
    assert.equal(await groups.count(), 8);
    assert.deepEqual(await groups.evaluateAll(nodes => nodes.slice(-3).map(node => node.dataset.section)), ['equipment', 'legalization', 'sales']);
    assert.ok((await page.locator('.cv-stage [data-section="legalization"]').innerText()).includes('Как открыть сыроварню официально'));
    assert.equal(await page.locator('.cv-stage [data-section="legalization"] .cv-caption').count(), 0);
    for (const [id, duration] of [['equipment', '38 мин 46 сек'], ['legalization', '44 мин 16 сек']]) {
      const group = page.locator(`.cv-stage [data-section="${id}"]`), meta = group.locator('.cv-topic-meta');
      assert.equal(await meta.isVisible(), false);
      const height = await group.evaluate(node => node.getBoundingClientRect().height);
      await group.locator('.cv-item-label').hover();
      assert.equal(await meta.isVisible(), true);
      assert.equal(await meta.innerText(), `Подкаст · ${duration}`);
      assert.equal(await group.evaluate(node => node.getBoundingClientRect().height), height);
      await group.locator('button').focus(); await page.keyboard.press('Escape');
      assert.equal(await meta.isVisible(), false);
      await group.locator('button').blur(); await group.locator('button').focus();
      assert.equal(await meta.isVisible(), true);
      await page.keyboard.press('Escape'); await group.locator('button').blur();
    }
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.cv-scroll-progress').getAttribute('d'), await page.locator('.cv-trunk').getAttribute('d'));
    assert.equal(await page.locator('#club-scroll-clip rect').evaluate(node => node.style.transform), 'scaleY(1)');
    await page.locator('[data-reviews-toggle]').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.review-shot:not([hidden])').count(), 11);
    await page.locator('[data-reviews-toggle]').click();
    assert.equal(await page.locator('.review-shot:not([hidden])').count(), 4);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.site-pending'));
    assert.equal(await page.locator('.cv-scroll-progress').count(), 0);
    assert.deepEqual(await page.locator('.stat__value').allTextContents(), ['77', '12', '6', 'Лично']);
  } finally { await browser.close(); }
});

test('headings reveal at 87% and content groups at 81% of viewport height', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [360, 390, 430, 1440]) {
      const page = await pageFor(browser, width);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.waitForTimeout(1000);
      async function position(selector, fraction) {
        await page.locator(selector).evaluate((node, fraction) => {
          scrollTo({ top: scrollY + node.getBoundingClientRect().top - innerHeight * fraction, behavior: 'instant' });
        }, fraction);
        await page.waitForTimeout(110);
      }
      const heading = page.locator('#recognition .block__title');
      await position('#recognition .block__title', .96);
      await position('#recognition .block__title', .885);
      assert.equal(await heading.getAttribute('data-site-reveal'), 'pending', `${width}: heading waits inside viewport`);
      await position('#recognition .block__title', .86);
      assert.equal(await heading.getAttribute('data-site-reveal'), 'seen', `${width}: heading uses earlier line`);

      await position('.recognition__list', .83);
      const items = page.locator('.recognition__list > li');
      assert.deepEqual(await items.evaluateAll(nodes => nodes.map(node => node.dataset.siteReveal)), Array(5).fill('pending'));
      await position('.recognition__list', .80);
      assert.deepEqual(await items.evaluateAll(nodes => nodes.map(node => node.dataset.siteReveal)), Array(5).fill('seen'));
      const stagger = await items.evaluateAll(nodes => nodes.map(node => {
        const animation = node.getAnimations()[0];
        return animation && animation.effect.getTiming().delay;
      }));
      assert.deepEqual(stagger, [0, 90, 180, 270, 360], `${width}: one container activates every child`);
      assert.ok(await items.last().evaluate(node => node.getBoundingClientRect().top > innerHeight * .81));

      // Recalculate the line after height-only resizing, without replaying seen content.
      await page.setViewportSize({ width, height: 720 });
      await position('#selection .text-flow', .96);
      await position('#selection .text-flow', .83);
      assert.equal(await page.locator('#selection .text-flow').getAttribute('data-site-reveal'), 'pending');
      await position('#selection .text-flow', .80);
      assert.equal(await page.locator('#selection .text-flow').getAttribute('data-site-reveal'), 'seen');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('CTA sheen repeats every 3.5 seconds, pauses offscreen and respects reduced motion', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await pageFor(browser, 390);
    const button = page.locator('.hero .cta-button');
    await button.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const button = document.querySelector('.hero .cta-button');
      return button.getAnimations({ subtree: true }).some(animation => animation.animationName === 'site-sheen' && animation.effect.getComputedTiming().currentIteration >= 1);
    });
    const timing = await button.evaluate(node => {
      const animation = node.getAnimations({ subtree: true }).find(animation => animation.animationName === 'site-sheen');
      return { duration: animation.effect.getTiming().duration, repeats: animation.effect.getTiming().iterations, state: animation.playState };
    });
    assert.deepEqual(timing, { duration: 3500, repeats: Infinity, state: 'running' });
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.hero .cta-button'), '::after').animationPlayState === 'paused');
    await button.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.hero .cta-button'), '::after').animationPlayState === 'running');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.site-sheen, .site-sheen-visible'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('.hero .cta-button').classList.contains('site-sheen'));
    assert.equal(await button.evaluate(node => getComputedStyle(node, '::after').animationPlayState), 'running');
  } finally { await browser.close(); }
});
