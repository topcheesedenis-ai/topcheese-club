/* Shared page motion; the hero seal and graph introduction keep their own timing. */
(function () {
  'use strict';
  const mobile = matchMedia('(max-width:699px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let cleanup = () => {};
  const seen = new WeakSet(), counted = new WeakSet(), polished = new WeakSet();
  function start() {
    cleanup();
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const scope = new AbortController(), animations = new Set(), counters = new Map();
    let frame = 0, lastY = scrollY, lastTime = performance.now(), speed = 0;
    const map = document.querySelector(mobile.matches ? '.cv-mobile' : '[data-map-tree]');
    const visual = document.querySelector('[data-product-visual]');
    const links = mobile.matches ? null : map?.querySelector('.cv-links');
    let accent = null, clip = null, clipRect = null, clipWidth = 0, clipHeight = 0;
    if (links) {
      const svgNode = name => document.createElementNS('http://www.w3.org/2000/svg', name);
      clip = svgNode('clipPath'); clip.id = 'club-scroll-clip';
      clipRect = svgNode('rect'); clip.append(clipRect);
      accent = svgNode('path'); accent.classList.add('cv-scroll-progress');
      accent.setAttribute('clip-path', 'url(#club-scroll-clip)');
      links.append(clip, accent);
    }
    const path = document.querySelector('.selection-path');
    const originalPath = path?.innerHTML;
    if (path) [...path.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const step = document.createElement('span'); step.className = 'site-process-step';
        step.textContent = node.textContent.trim(); node.replaceWith(step);
      } else if (node.nodeType === Node.ELEMENT_NODE) node.classList.add('site-process-arrow');
    });
    const selectors = [
      ...(mobile.matches ? ['.cv-root-logo', '.cv-title', '.cv-metric', '.cv-mobile > .cv-mobile-group'] : []), '.stat',
      '#recognition .block__title', '#recognition li',
      '#selection .block__title', '#selection .selection-path', '#selection .text-flow',
      '#halloumi .halloumi-heading', '#halloumi .process-steps > li',
      '#halloumi .halloumi-results > h3', '#halloumi .halloumi-results__list > div',
      '#halloumi .halloumi-photo', '#halloumi .halloumi-summary',
      '#questions .question-heading', '#questions .text-flow', '#questions .question-example',
      '#questions .question-layout__main > .card-note', '#questions .answer-note', '#questions .access-strip',
      '#growing .section-heading', '#growing .text-flow', '#author .author__content > *',
      '#author .author-story__frame', '#author .author-story__caption',
      '#reviews .reviews-heading', '#reviews .review-shot', '#reviews [data-reviews-toggle]',
      '#tariffs .purchase-terms > *', '#tariffs .price-card', '#club_cta_bottom', '#tariffs .pricing__note'
    ];
    const targets = [...document.querySelectorAll(selectors.join(','))];
    const grouped = new Map(), pendingOwners = new Map();
    // Lists and related cards share one trigger; standalone content keeps its own entry point.
    document.querySelectorAll('.stats, .recognition__list, .process-steps, .halloumi-results__list, .question-examples, .author-story__photos, .reviews-grid, .pricing').forEach(group => {
      [...group.children].filter(node => targets.includes(node)).forEach(node => grouped.set(node, group));
    });
    const headingSelector = 'h2, h3, .section-kicker, .cv-root-logo, .cv-title, .cv-metric, .halloumi-heading, .question-heading, .section-heading, .reviews-heading';
    let headingObserver, contentObserver, viewportHeight = 0;
    function run(node, frames, options) {
      const animation = node.animate(frames, { duration: 420, easing: 'cubic-bezier(.2,.65,.3,1)', ...options });
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
      return animation;
    }
    function count(stat, immediate, delay) {
      const value = stat.querySelector('.stat__value');
      if (!value || !/^\d+$/.test(value.textContent) || counted.has(value)) return;
      counted.add(value);
      const final = value.textContent, number = Number(final);
      if (immediate) return;
      const visible = document.createElement('span'), accessible = document.createElement('span');
      visible.setAttribute('aria-hidden', 'true'); visible.textContent = '0';
      accessible.className = 'site-count-label'; accessible.textContent = final;
      value.replaceChildren(visible, accessible);
      const started = performance.now() + delay;
      function finish() { value.textContent = final; counters.delete(value); }
      counters.set(value, finish);
      function tick(now) {
        if (!counters.has(value)) return;
        const progress = Math.min(1, Math.max(0, (now - started) / 850));
        visible.textContent = Math.round(number * (1 - Math.pow(1 - progress, 3)));
        if (progress === 1) finish(); else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    function sheen(button, delay = 0) {
      if (button.classList.contains('site-sheen')) return;
      button.classList.add('site-sheen');
      button.style.setProperty('--sheen-delay', `${delay}ms`);
    }
    function reveal(node, immediate, delay) {
      node.classList.remove('site-pending');
      if (seen.has(node)) return;
      seen.add(node); node.dataset.siteReveal = 'seen';
      if (!immediate && node !== path) {
        const photo = node.matches('.author__media, .author-story__frame, .halloumi-photo');
        const stationary = photo || node.matches('.cv-group');
        const frames = stationary ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }];
        run(node, frames, { duration: photo ? 480 : 420, delay, fill: 'backwards' });
      }
      if (node.matches('.stat')) count(node, immediate, delay);
      if (node === path && !polished.has(path)) {
        polished.add(path);
        if (!immediate) [...path.children].forEach((part, i) => run(part,
          part.classList.contains('site-process-arrow') ? [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }] : [{ opacity: 0 }, { opacity: 1 }],
          { duration: 260, delay: delay + i * 140, fill: 'backwards' }));
      }
      if (node.matches('.cta-button')) sheen(node, immediate ? 0 : delay + 440);
    }
    function activate(owner, immediate) {
      const nodes = pendingOwners.get(owner);
      if (!nodes) return;
      headingObserver.unobserve(owner); contentObserver.unobserve(owner); pendingOwners.delete(owner);
      nodes.filter(node => !seen.has(node) && !node.hidden).forEach((node, index) => reveal(node, immediate, immediate ? 0 : index * 90));
    }
    function onIntersect(entries) {
      entries.filter(entry => entry.isIntersecting && !entry.target.hidden)
        .forEach(entry => {
          // A fast swipe or an arrival deep in the viewport must never queue a long reveal.
          const immediate = speed > 1.4 || entry.boundingClientRect.top < innerHeight * .55;
          activate(entry.target, immediate);
        });
    }
    function observerFor(owner) { return owner.matches(headingSelector) ? headingObserver : contentObserver; }
    function refreshObservers() {
      if (viewportHeight === innerHeight) return;
      viewportHeight = innerHeight;
      headingObserver?.disconnect(); contentObserver?.disconnect();
      // IO percentage margins resolve against width. Pixels keep these lines at 87% / 81% of height.
      const observerAt = inset => new IntersectionObserver(onIntersect, { rootMargin: `0px 0px -${Math.round(viewportHeight * inset)}px 0px`, threshold: 0 });
      headingObserver = observerAt(.13); contentObserver = observerAt(.19);
      pendingOwners.forEach((nodes, owner) => observerFor(owner).observe(owner));
    }
    function observe(node) {
      if (seen.has(node)) return;
      node.dataset.siteReveal = 'pending'; node.classList.add('site-pending');
      const owner = grouped.get(node) || node;
      if (pendingOwners.has(owner)) return;
      pendingOwners.set(owner, owner === node ? [node] : [...owner.children].filter(child => grouped.get(child) === owner));
      observerFor(owner).observe(owner);
    }
    refreshObservers();
    targets.forEach(observe);
    function observeGraph() {
      if (!links || visual?.classList.contains('is-compact') || map.classList.contains('is-entering')) return;
      map.querySelectorAll('.cv-stage > .cv-group').forEach(node => {
        if (seen.has(node)) return;
        // Visible groups have just completed the seal introduction. Only defer unread rows.
        const rect = node.getBoundingClientRect();
        if (rect.top < innerHeight * .93 && rect.bottom > 0) { seen.add(node); return; }
        targets.push(node); observe(node);
      });
      schedule();
    }
    visual?.addEventListener('club-map:revealed', observeGraph, { signal: scope.signal });
    const buttonObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('site-sheen-visible', entry.isIntersecting);
      if (!entry.isIntersecting || entry.intersectionRatio < .8 || entry.target.classList.contains('site-pending')) return;
      sheen(entry.target, entry.target.closest('.hero') ? 850 : 440);
    }), { threshold: [0, .8] });
    document.querySelectorAll('.cta-button').forEach(button => buttonObserver.observe(button));
    function progress() {
      frame = 0;
      refreshObservers();
      if (!map) return;
      const rect = map.getBoundingClientRect();
      const amount = Math.min(1, Math.max(0, (innerHeight * .72 - rect.top) / Math.max(1, rect.height)));
      map.style.setProperty('--map-progress', amount.toFixed(4));
      if (accent) {
        const d = links.querySelector('.cv-trunk')?.getAttribute('d') || '';
        if (accent.getAttribute('d') !== d) accent.setAttribute('d', d);
        if (rect.width !== clipWidth) { clipWidth = rect.width; clipRect.setAttribute('width', clipWidth); }
        if (rect.height !== clipHeight) { clipHeight = rect.height; clipRect.setAttribute('height', clipHeight); }
        clipRect.style.transform = `scaleY(${amount.toFixed(4)})`;
      }
      if (speed > 1.4) {
        animations.forEach(animation => animation.finish());
        counters.forEach(finish => finish());
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(progress); }
    window.addEventListener('scroll', () => {
      const now = performance.now(); speed = Math.abs(scrollY - lastY) / Math.max(16, now - lastTime);
      lastY = scrollY; lastTime = now; schedule();
    }, { passive: true, signal: scope.signal });
    window.addEventListener('resize', schedule, { signal: scope.signal });
    const resize = new ResizeObserver(schedule); if (map) resize.observe(map);
    document.querySelector('[data-reviews]')?.addEventListener('site:reviews', event => {
      event.detail.forEach(observe);
      // The explicit “show more” action starts the new batch without waiting for another scroll crossing.
      if (event.detail.length) activate(grouped.get(event.detail[0]), false);
    }, { signal: scope.signal });
    document.addEventListener('focusin', event => {
      const pending = event.target.closest('.site-pending');
      if (pending) activate(grouped.get(pending) || pending, true);
    }, { signal: scope.signal });
    observeGraph(); progress();
    cleanup = () => {
      scope.abort(); headingObserver.disconnect(); contentObserver.disconnect(); buttonObserver.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel()); counters.forEach(finish => finish());
      targets.forEach(node => { node.classList.remove('site-pending'); node.removeAttribute('data-site-reveal'); });
      document.querySelectorAll('.cta-button').forEach(node => { node.classList.remove('site-sheen', 'site-sheen-visible'); node.style.removeProperty('--sheen-delay'); });
      map?.style.removeProperty('--map-progress'); accent?.remove(); clip?.remove();
      if (path) path.innerHTML = originalPath;
    };
  }
  mobile.addEventListener('change', start); reduced.addEventListener('change', start); start();
})();
