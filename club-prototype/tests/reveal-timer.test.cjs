const { test } = require('node:test');
const assert = require('node:assert/strict');
let createRevealTimer;
try { ({ createRevealTimer } = require('../landing-interactions.js')); } catch {}

function clock() {
  let time = 0, task = null;
  return {
    now: () => time,
    schedule: (fn, delay) => { task = { fn, due: time + delay }; return task; },
    cancel: () => { task = null; },
    advance: (ms) => { time += ms; if (task && task.due <= time) { const fn = task.fn; task = null; fn(); } }
  };
}
function setup() {
  assert.equal(typeof createRevealTimer, 'function', 'visible-time reveal timer must exist');
  const c = clock(); let count = 0;
  const timer = createRevealTimer({ delay: 5200, onReveal: () => count++, ...c });
  return { c, timer, count: () => count };
}
test('auto reveal counts only time while the hero is eligible and visible', () => {
  const {c,timer,count} = setup();
  c.advance(10000); assert.equal(count(),0);
  timer.setActive(true); c.advance(2000);
  timer.setActive(false); c.advance(20000); assert.equal(count(),0);
  timer.setActive(true); c.advance(3199); assert.equal(count(),0);
  c.advance(1); assert.equal(count(),1);
});
test('manual activation reveals immediately and cannot auto-reveal a second time', () => {
  const {c,timer,count} = setup();
  timer.setActive(true); c.advance(100);
  timer.reveal(); assert.equal(count(),1);
  c.advance(20000); timer.reveal(); timer.setActive(true);
  assert.equal(count(),1);
});
test('disposing the gate cancels a pending transition', () => {
  const {c,timer,count} = setup();
  timer.setActive(true); timer.dispose(); c.advance(20000);
  timer.setActive(true); timer.reveal(); assert.equal(count(),0);
});
