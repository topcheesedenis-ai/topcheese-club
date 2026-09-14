const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.WELCOME_TEST_URL || 'http://localhost:8791/welcome/';

// Exercise empty and configured states independently of the published videos.
async function mockVideoConfig(page, embedUrl = '') {
  await page.route('**/config.js*', async route => {
    const response = await route.fetch();
    const body = await response.text() +
      `\nwindow.CLUB_WELCOME.video.embedUrl = ${JSON.stringify(embedUrl)};`;
    await route.fulfill({ response, body });
  });
}

test('footer documents and cookie settings are shared with the club without loading trackers', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mockVideoConfig(page);
    page.setDefaultTimeout(5000);
    const external = [], errors = [];
    page.on('request', request => { if (!request.url().startsWith(new URL(url).origin)) external.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const footer = page.getByRole('contentinfo');
    assert.equal(await footer.getByRole('link', { name: 'Публичная оферта' }).getAttribute('href'), 'https://topcheese.online/oferta');
    assert.equal(await footer.getByRole('link', { name: 'Политика конфиденциальности' }).getAttribute('href'), 'https://topcheese.online/politconf');
    assert.match(await footer.innerText(), /ИП Ильченко Денис Юрьевич/);
    assert.match(await footer.innerText(), /237300809600/);
    await footer.getByRole('button', { name: 'Настройки cookie' }).click();
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await dialog.getByRole('switch', { name: 'Аналитика' }).isChecked(), true);
    await dialog.getByRole('switch', { name: 'Аналитика' }).uncheck();
    await dialog.getByRole('switch', { name: 'Маркетинг' }).uncheck();
    await dialog.getByRole('button', { name: 'СОХРАНИТЬ', exact: true }).click();
    assert.equal(await dialog.isVisible(), false);
    await page.reload();
    await footer.getByRole('button', { name: 'Настройки cookie' }).click();
    assert.equal(await dialog.getByRole('switch', { name: 'Аналитика' }).isChecked(), false);
    assert.equal(await dialog.getByRole('switch', { name: 'Маркетинг' }).isChecked(), false);
    await page.keyboard.press('Escape');
    assert.equal(await footer.getByRole('button', { name: 'Настройки cookie' }).evaluate(el => el === document.activeElement), true);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);

    // A choice made on /welcome must apply to the existing landing too.
    await page.route('**/*', route => route.request().url().startsWith(new URL(url).origin) ? route.continue() : route.abort());
    await page.goto(new URL('/club-prototype/', url).href);
    assert.equal(await page.locator('[data-cookie-banner]').isVisible(), false);
    await page.locator('[data-cookie-settings]').click();
    assert.equal(await page.getByRole('switch', { name: 'Аналитика' }).isChecked(), false);
    assert.equal(await page.getByRole('switch', { name: 'Маркетинг' }).isChecked(), false);
    await page.close();
  } finally { await browser.close(); }
});

test('responsive onboarding defaults, links and placeholders work without analytics', async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320,360,390,430,768,1280,1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await mockVideoConfig(page);
      const errors=[], external=[];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (!request.url().startsWith(new URL(url).origin)) external.push(request.url()); });
      await page.goto(url);
      assert.equal(await page.getByRole('tab').count(),0);
      assert.equal(await page.locator('#video-panel iframe').count(),0);
      assert.match(await page.locator('[data-video-placeholder]').innerText(),/скоро появится/);
      assert.equal(await page.getByRole('link',{name:'Перейти на платформу',exact:false}).getAttribute('href'),'https://academy.topcheese.online/teach/control/stream/view/id/934948905');
      assert.equal(await page.getByRole('link',{name:'Telegram',exact:false}).getAttribute('href'),'https://t.me/m/xGGOPzJHZThi');
      assert.equal(await page.getByRole('link',{name:'MAX',exact:false}).getAttribute('href'),'https://max.ru/u/f9LHodD0cOJP9xMJkSbSB6DIUO79u6SOhoXZV4aCTSPxULF6PUfu1sam21Y');
      assert.equal(await page.locator('.steps > li').count(),4);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('the same configured video appears on every screen and resizing keeps the player', async () => {
  const browser = await chromium.launch();
  const videoUrl = 'https://vkvideo.ru/video_ext.php?oid=-212599640&id=456239049&hash=240edae4ac390841&hd=3';
  try {
    for (const width of [320, 360, 390, 430, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      let loads = 0;
      await page.route('https://vkvideo.ru/**', route => {
        loads++;
        return route.fulfill({ contentType: 'text/html', body: '<p>Video fixture</p>' });
      });
      await page.goto(url);
      assert.equal(await page.getByRole('tab').count(), 0);
      const frame = page.locator('#video-panel iframe');
      assert.equal(await frame.count(), 1);
      assert.equal(await frame.getAttribute('src'), videoUrl);
      assert.equal(await frame.getAttribute('title'), 'Как войти на платформу и начать работу');
      assert.equal(await page.locator('[data-video-placeholder]').isVisible(), false);
      assert.equal(await frame.getAttribute('allowfullscreen'), '');
      const box = await frame.boundingBox();
      assert.ok(Math.abs(box.width / box.height - 1920 / 1002) < .02);
      await page.setViewportSize({ width: width < 700 ? 1440 : 390, height: 900 });
      assert.equal(await frame.count(), 1);
      assert.equal(loads, 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
    }
  } finally { await browser.close(); }
});
