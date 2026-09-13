/* Optional integrations must be registered here, never loaded directly in HTML. */
(function () {
  'use strict';
  const KEY = 'topcheese.cookie-consent';
  const VERSION = 1;
  const categories = ['analytics', 'marketing'];

  function createConsentManager({ storage, reload, onChange = () => {}, onError = () => {} }) {
    function read() {
      try {
        const value = JSON.parse(storage.getItem(KEY));
        return value && value.version === VERSION && value.necessary === true &&
          categories.every(category => typeof value[category] === 'boolean') ? value : null;
      } catch (_) { return null; }
    }
    let choice = read();
    const integrations = new Map();
    const active = new Map();
    const get = () => ({ necessary: true, analytics: false, marketing: false, ...choice });
    const isAllowed = category => categories.includes(category) && get()[category] === true;

    function reconcile() {
      let revoked = false;
      for (const [id, running] of active) {
        if (isAllowed(integrations.get(id).category)) continue;
        revoked = true;
        running.controller.abort();
        try { running.cleanup?.(); } catch (error) { onError(error); }
        active.delete(id);
      }
      onChange(get(), choice !== null);
      // Removing a script cannot undo its globals, timers or listeners. A fresh
      // document guarantees that revoked integrations no longer execute.
      if (revoked) { reload(); return; }
      for (const [id, integration] of integrations) {
        if (!isAllowed(integration.category) || active.has(id)) continue;
        const running = { controller: new AbortController(), cleanup: null };
        active.set(id, running);
        try {
          running.cleanup = integration.start({
            signal: running.controller.signal,
            isAllowed: () => isAllowed(integration.category),
          });
          if (typeof running.cleanup !== 'function') running.cleanup = null;
        } catch (error) { onError(error); }
      }
    }

    return {
      get,
      isAllowed,
      hasChoice: () => choice !== null,
      register({ id, category, start }) {
        if (!id || integrations.has(id) || !categories.includes(category) || typeof start !== 'function') {
          throw new TypeError('Expected a unique id, analytics/marketing category and start callback.');
        }
        integrations.set(id, { category, start });
        reconcile();
      },
      save({ analytics = false, marketing = false }) {
        const next = { version: VERSION, necessary: true, analytics: analytics === true,
          marketing: marketing === true, updatedAt: new Date().toISOString() };
        // Do not report a saved choice or launch trackers if persistence fails.
        try { storage.setItem(KEY, JSON.stringify(next)); }
        catch (error) { onError(error); return false; }
        choice = next;
        reconcile();
        return true;
      },
      sync() { choice = read(); reconcile(); },
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createConsentManager, KEY };
    return;
  }

  const manager = createConsentManager({
    storage: {
      getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    reload: () => window.location.reload(),
    onChange: (consent, hasChoice) => {
      window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: { consent, hasChoice } }));
    },
    onError: error => console.warn('Cookie consent:', error),
  });

  // Small registry API for future counters/pixels. Registration itself performs
  // no network requests. Put ALL vendor initialization inside start().
  window.ClubCookieConsent = Object.freeze({
    get: manager.get,
    hasChoice: manager.hasChoice,
    isAllowed: manager.isAllowed,
    register: manager.register,
    registerScript({ id, category, src, onLoad }) {
      manager.register({ id, category, start({ signal, isAllowed }) {
        const script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.addEventListener('load', () => {
          if (!signal.aborted && isAllowed()) onLoad?.();
        }, { once: true, signal });
        document.head.appendChild(script);
        return () => script.remove();
      } });
    },
    openSettings: () => openSettings(),
  });

  const banner = document.querySelector('[data-cookie-banner]');
  const dialog = document.querySelector('[data-cookie-dialog]');
  const form = dialog.querySelector('form');
  const analytics = form.elements.analytics;
  const marketing = form.elements.marketing;
  const footerLink = document.querySelector('[data-cookie-settings]');
  const purchaseButtons = [...document.querySelectorAll('#club_cta_hero, #club_cta_bottom')];
  let opener = null;

  function updateBanner() {
    banner.hidden = manager.hasChoice() || dialog.open;
    document.documentElement.classList.toggle('cookie-banner-visible', !banner.hidden);
    updateDockHeight();
  }
  function updateDockHeight() {
    const height = banner.hidden ? 0 : Math.ceil(banner.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--cookie-banner-height',
      `${height}px`);
    // Measure collisions against the resting dock, not its shifted position,
    // so scrolling cannot alternate between two positions.
    const rect = banner.getBoundingClientRect();
    const currentLift = parseFloat(document.documentElement.style.getPropertyValue('--cookie-dock-lift')) || 0;
    const restingBottom = rect.bottom + currentLift;
    const restingTop = restingBottom - height;
    let lift = 0;
    if (!banner.hidden) purchaseButtons.forEach(button => {
      const cta = button.getBoundingClientRect();
      if (cta.width && cta.right > rect.left && cta.left < rect.right &&
          cta.top < restingBottom + 12 && cta.bottom > restingTop - 12 && cta.top < innerHeight) {
        // Include the landing's existing 16px entrance motion in the clearance.
        lift = Math.max(lift, restingBottom - cta.top + 28);
      }
    });
    document.documentElement.style.setProperty('--cookie-dock-lift', `${Math.max(0, lift)}px`);
  }
  function openSettings() {
    if (dialog.open) return;
    const consent = manager.get();
    analytics.checked = consent.analytics;
    marketing.checked = consent.marketing;
    opener = document.activeElement;
    dialog.querySelector('[data-cookie-error]').hidden = true;
    dialog.showModal();
    updateBanner();
  }
  function save(all, errorTarget) {
    const saved = manager.save(all ? { analytics: true, marketing: true } : {
      analytics: analytics.checked, marketing: marketing.checked,
    });
    errorTarget.hidden = saved;
    if (!saved) return;
    if (dialog.open) dialog.close();
    updateBanner();
  }

  banner.querySelector('[data-cookie-accept]').addEventListener('click', () =>
    save(true, banner.querySelector('[data-cookie-error]')));
  banner.querySelector('[data-cookie-customize]').addEventListener('click', openSettings);
  footerLink.addEventListener('click', openSettings);
  form.addEventListener('submit', event => {
    event.preventDefault();
    save(event.submitter?.value === 'all', dialog.querySelector('[data-cookie-error]'));
  });
  dialog.addEventListener('close', () => {
    updateBanner();
    // Native dialog handles focus trapping. Avoid returning focus into a banner
    // that has just been hidden after a successful save.
    if (opener && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
    else if (manager.hasChoice()) {
      const visiblePurchase = purchaseButtons.find(button => {
        const rect = button.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight;
      });
      (visiblePurchase || document.querySelector('.sticky-cta--visible a') || footerLink)
        .focus({ preventScroll: true });
    }
  });
  window.addEventListener('cookieconsentchange', updateBanner);
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) {
      manager.sync();
      const consent = manager.get();
      analytics.checked = consent.analytics;
      marketing.checked = consent.marketing;
    }
  });
  if ('ResizeObserver' in window) new ResizeObserver(updateDockHeight).observe(banner);
  else window.addEventListener('resize', updateDockHeight);
  let dockFrame = 0;
  function scheduleDockUpdate() {
    if (dockFrame) return;
    dockFrame = requestAnimationFrame(() => { dockFrame = 0; updateDockHeight(); });
  }
  window.addEventListener('scroll', scheduleDockUpdate, { passive: true });
  window.addEventListener('resize', scheduleDockUpdate);
  updateBanner();
})();
