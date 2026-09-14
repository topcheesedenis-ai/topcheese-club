(function () {
  'use strict';

  // Pauseable exposure time: leaving the hero or tab must not spend reading time.
  function createRevealTimer({ delay, onReveal, now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout }) {
    let remaining = delay, started = 0, task = null, done = false;
    function pause() {
      if (task === null) return;
      remaining = Math.max(0, remaining - (now() - started));
      cancel(task); task = null;
    }
    function reveal() {
      if (done) return;
      pause(); done = true; onReveal();
    }
    return {
      setActive(active) {
        if (done) return;
        if (!active) { pause(); return; }
        if (task !== null) return;
        started = now(); task = schedule(reveal, remaining);
      },
      reveal,
      dispose() { pause(); done = true; }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createRevealTimer };
  if (typeof document === 'undefined') return;

  const landing = document.querySelector('[data-landing-root]');
  if (!landing) return;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const desktop = matchMedia('(min-width:1100px)');
  const reviewDesktop = matchMedia('(min-width:700px)');
  const activeAnimations = new Set();
  const tokens = getComputedStyle(document.documentElement);
  const duration = parseFloat(tokens.getPropertyValue('--motion-duration')) || 380;
  const stagger = parseFloat(tokens.getPropertyValue('--motion-stagger')) || 90;
  const easing = tokens.getPropertyValue('--motion-ease').trim() || 'ease-out';

  function animate(element, frames, options = {}) {
    if (reduced.matches || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, { duration, easing, ...options });
    activeAnimations.add(animation);
    return animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  }
  function revealItems(items) {
    return Promise.all(items.map((element, index) => {
      element.classList.remove('motion-prepared');
      return animate(element, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { delay: index * stagger, fill: 'backwards' });
    }));
  }
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    activeAnimations.forEach(animation => animation.finish());
    document.querySelectorAll('.motion-prepared').forEach(element => element.classList.remove('motion-prepared'));
  });

  const visual = document.querySelector('[data-product-visual]');
  const intro = document.querySelector('[data-product-intro]');
  const copy = document.querySelector('.hero__copy');
  const map = document.querySelector('[data-map-tree]');
  const heroLayout = copy?.closest('.hero__layout');
  let copyReady = false, copyVisible = false;
  let activated = false;
  // The copy finishes in about .8s. A further 5.2s gives around 6s total on desktop.
  const gate = createRevealTimer({ delay: 5200, onReveal: openProduct });
  function prepareSeal() {
    if (!desktop.matches || activated || !visual.classList.contains('is-compact')) return;
    const root = map.querySelector('.cv-root');
    if (!root) return;
    const logo = root.querySelector('.cv-root-logo'), title = root.querySelector('.cv-title');
    // Align both actions, independent of the hidden graph's much taller layout.
    const purchase = copy.querySelector('.cta-button').getBoundingClientRect();
    const visualBox = visual.getBoundingClientRect();
    const introBox = intro.getBoundingClientRect();
    const actionBox = intro.querySelector('.product-intro__action').getBoundingClientRect();
    // Ignore the copy's entrance motion when measuring its final CTA position.
    const buyOffset = new DOMMatrixReadOnly(getComputedStyle(copy.querySelector('.buy')).transform).m42;
    intro.style.top = `${purchase.top - buyOffset + purchase.height / 2 - visualBox.top - (introBox.height - actionBox.height) / 2}px`;
    // Measure the final, untransformed root. No text width changes between states.
    [root, logo, title].forEach(element => element.style.removeProperty('transform'));
    const seal = intro.querySelector('.product-seal').getBoundingClientRect();
    const box = root.getBoundingClientRect(), logoBox = logo.getBoundingClientRect(), titleBox = title.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    root.style.transform = `translate(${seal.left + seal.width / 2 - cx}px, ${seal.top + seal.height / 2 - cy}px)`;
    logo.style.transform = `translate(${cx - logoBox.left - logoBox.width / 2}px, ${cy - seal.width * .08 - logoBox.top - logoBox.height / 2}px) scale(${seal.width / 250})`;
    title.style.transform = `translate(${cx - titleBox.left - titleBox.width / 2}px, ${cy + seal.width * .088 - titleBox.top - titleBox.height / 2}px) scale(${seal.width / 300})`;
    root.querySelector('.cv-metric').style.opacity = '0';
    visual.classList.add('is-seal-ready');
  }
  function openProduct() {
    if (activated || !visual.classList.contains('is-compact')) return;
    activated = true;
    const hadFocus = document.activeElement === intro && intro.matches(':focus-visible');
    const root = map.querySelector('.cv-root');
    const parts = root ? [root, root.querySelector('.cv-root-logo'), root.querySelector('.cv-title')] : [];
    const transforms = parts.map(element => element.style.transform || 'none');
    const morph = desktop.matches && !!root && !reduced.matches;
    intro.setAttribute('aria-expanded', 'true');
    heroLayout.classList.remove('is-reading');
    visual.classList.remove('is-compact');
    visual.classList.toggle('is-morphing', morph);
    // Reset to the final layout before the graph measures its connecting lines.
    parts.forEach(element => element.style.removeProperty('transform'));
    root?.querySelector('.cv-metric').style.removeProperty('opacity');
    map.inert = false;
    map.removeAttribute('aria-hidden');
    visual.dispatchEvent(new CustomEvent('club-map:reveal', { detail: { focus: hadFocus, morph } }));
    if (morph) {
      parts.forEach((element, index) => {
        const frames = [{ transform: transforms[index] }];
        if (index > 0) {
          // Separate the seal's stacked logo/title horizontally before closing
          // their vertical gap, so the larger hub never crosses its own text.
          const start = new DOMMatrixReadOnly(transforms[index]);
          frames.push({ transform: `translate(0px, ${start.m42}px) scale(1)`, offset: .55 });
        }
        frames.push({ transform: 'none' });
        animate(element, frames, { duration: 520 });
      });
      animate(root.querySelector('.cv-metric'), [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 360, fill: 'backwards' });
    }
  }
  function updateGate() {
    gate.setActive(copyReady && copyVisible && desktop.matches && !document.hidden && !reduced.matches && !activated);
  }
  if (visual && intro && copy && map && window.CLUB_MAP) {
    if (desktop.matches) {
      visual.classList.add('is-compact'); map.inert = true; map.setAttribute('aria-hidden', 'true');
      heroLayout.classList.add('is-reading');
    }
    visual.addEventListener('club-map:ready', prepareSeal);
    visual.addEventListener('club-map:revealed', () => visual.classList.remove('is-morphing'));
    const sealObserver = new ResizeObserver(prepareSeal);
    sealObserver.observe(visual);
    sealObserver.observe(copy);
    let pointer = null;
    document.addEventListener('pointermove', event => {
      const moved = !pointer || pointer.x !== event.clientX || pointer.y !== event.clientY;
      pointer = { x: event.clientX, y: event.clientY };
      if (moved && event.pointerType === 'mouse' && intro.contains(event.target)) gate.reveal();
    }, { passive: true });
    intro.addEventListener('click', () => gate.reveal());
    desktop.addEventListener('change', () => {
      if (!desktop.matches && visual.classList.contains('is-compact')) gate.reveal();
      updateGate();
    });
    document.addEventListener('visibilitychange', updateGate);
    reduced.addEventListener('change', updateGate);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        copyVisible = entries[0].intersectionRatio >= .6;
        updateGate();
      }, { threshold: [0, .6] }).observe(copy);
    } else { copyVisible = true; }
    const copyItems = [...copy.children];
    copyItems.forEach(element => element.classList.add('motion-prepared'));
    revealItems(copyItems).then(() => { copyReady = true; updateGate(); });
  }

  // Native details provide the fallback and semantics; animate only the answer body.
  document.querySelectorAll('.question-example').forEach(details => {
    const summary = details.querySelector('summary'), body = details.querySelector('.question-example__body');
    let busy = false;
    summary.addEventListener('click', async event => {
      if (reduced.matches || !body.animate) return;
      event.preventDefault();
      if (busy) return;
      busy = true;
      const opening = !details.open;
      if (opening) details.open = true;
      const height = body.scrollHeight;
      await animate(body, [{ height: `${opening ? 0 : height}px`, opacity: opening ? 0 : 1 }, { height: `${opening ? height : 0}px`, opacity: opening ? 1 : 0 }]);
      details.open = opening; busy = false;
    });
  });

  const reviewRoot = document.querySelector('[data-reviews]');
  if (reviewRoot) {
    const toggle = reviewRoot.querySelector('[data-reviews-toggle]');
    const cards = [...reviewRoot.querySelectorAll('.review-shot')];
    const grid = reviewRoot.querySelector('.reviews-grid');
    let expanded = false;
    function layoutReviews() {
      grid.classList.toggle('reviews-grid--masonry', reviewDesktop.matches);
      cards.forEach(card => {
        if (!reviewDesktop.matches || card.hidden) {
          card.style.removeProperty('grid-row-end');
          return;
        }
        // Fixed columns preserve the ranked left-to-right order; rows follow each bubble's height.
        card.style.gridRowEnd = `span ${Math.ceil(card.getBoundingClientRect().height + 24)}`;
      });
    }
    function updateReviews(withMotion = false) {
      const initialCount = reviewDesktop.matches ? 4 : 2;
      const newlyVisible = [];
      cards.forEach((card, index) => {
        const hidden = !expanded && index >= initialCount;
        if (card.hidden && !hidden) newlyVisible.push(card);
        card.hidden = hidden;
      });
      toggle.hidden = cards.length <= initialCount;
      toggle.textContent = expanded ? 'Скрыть отзывы' : 'Показать ещё отзывы';
      toggle.setAttribute('aria-expanded', String(expanded));
      layoutReviews();
      if (withMotion) reviewRoot.dispatchEvent(new CustomEvent('site:reviews', { detail: newlyVisible }));
    }
    toggle.addEventListener('click', () => {
      expanded = !expanded; updateReviews(true);
      if (!expanded) toggle.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    reviewDesktop.addEventListener('change', () => updateReviews());
    if ('ResizeObserver' in window) {
      let lastWidth = 0;
      new ResizeObserver(entries => {
        const width = entries[0].contentRect.width;
        if (width === lastWidth) return;
        lastWidth = width;
        layoutReviews();
      }).observe(grid);
    } else {
      window.addEventListener('resize', layoutReviews);
    }
    updateReviews();
  }
})();
