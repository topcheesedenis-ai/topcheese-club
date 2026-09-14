const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.WELCOME_TEST_URL || 'http://localhost:8791/welcome/';

test('responsive onboarding defaults, links and placeholders work without analytics', async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320,360,390,430,768,1280,1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors=[], external=[];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (!request.url().startsWith(new URL(url).origin)) external.push(request.url()); });
      await page.goto(url);
      const device=width<700?'mobile':'desktop';
      assert.equal(await page.locator(`[data-device="${device}"]`).getAttribute('aria-selected'),'true');
      assert.equal(await page.locator('[role=tabpanel] iframe').count(),0);
      assert.match(await page.locator('[data-video-placeholder]').innerText(),/скоро появится/);
      assert.equal(await page.getByRole('link',{name:'Перейти на платформу',exact:false}).getAttribute('href'),'https://academy.topcheese.online/teach/control/stream/view/id/934948905');
      assert.equal(await page.getByRole('link',{name:'Telegram',exact:false}).getAttribute('href'),'https://t.me/m/xGGOPzJHZThi');
      assert.equal(await page.getByRole('link',{name:'MAX',exact:false}).getAttribute('href'),'https://max.ru/u/f9LHodD0cOJP9xMJkSbSB6DIUO79u6SOhoXZV4aCTSPxULF6PUfu1sam21Y');
      assert.equal(await page.locator('.steps > li').count(),4);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const tab of await page.getByRole('tab').all()) assert.ok((await tab.boundingBox()).height>=44);
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('manual device choice survives resizing and keyboard tabs remain usable', async () => {
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(url);
    await page.getByRole('tab',{name:'Компьютер',exact:true}).click();
    await page.setViewportSize({width:1440,height:900});
    assert.equal(await page.locator('[data-device=desktop]').getAttribute('aria-selected'),'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-device=mobile]').getAttribute('aria-selected'),'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-device=desktop]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[role=tab][tabindex="0"]').count(),1);
    await page.close();
  } finally { await browser.close(); }
});

test('configured VK videos use only the selected embed and stop on switching', async () => {
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.route('**/config.js*',async route=>{
      const response=await route.fetch();
      let body=await response.text();
      body=body.replace('embedUrl: "",','embedUrl: "https://vk.com/video_ext.php?oid=-1&id=10",');
      body=body.replace('embedUrl: "",','embedUrl: "https://vkvideo.ru/video_ext.php?oid=-1&id=20",');
      await route.fulfill({response,body});
    });
    await page.route('https://vk.com/**',route=>route.fulfill({contentType:'text/html',body:'<p>Video fixture</p>'}));
    await page.route('https://vkvideo.ru/**',route=>route.fulfill({contentType:'text/html',body:'<p>Video fixture</p>'}));
    await page.goto(url);
    assert.match(await page.locator('[role=tabpanel] iframe').getAttribute('src'),/id=10/);
    await page.getByRole('tab',{name:'Смартфон',exact:true}).click();
    assert.equal(await page.locator('[role=tabpanel] iframe').count(),1);
    assert.match(await page.locator('[role=tabpanel] iframe').getAttribute('src'),/id=20/);
    assert.equal(await page.locator('[data-video-placeholder]').isVisible(),false);
    await page.close();
  } finally {await browser.close();}
});
