/* All vendor code stays inside its consent category's start callback. */
(function () {
  'use strict';
  const consent = window.ClubCookieConsent;
  if (!consent) return; // Fail closed if the consent manager could not load.

  consent.register({
    id: 'yandex-metrika-112548973',
    category: 'analytics',
    start({ signal, isAllowed }) {
      const counterId = 112548973;
      const src = 'https://mc.yandex.ru/metrika/tag.js?id=112548973';
      window.ym = window.ym || function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
      window.ym.l = window.ym.l || Date.now();
      let initialized = false;
      function initialize() {
        if (initialized || signal.aborted || !isAllowed()) return;
        initialized = true;
        window.ym(counterId, 'init', {
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: 'dataLayer',
          referrer: document.referrer,
          url: window.location.href,
          accurateTrackBounce: true,
          trackLinks: true,
        });
      }

      // Reuse the same library if it is already present, as in Yandex's snippet.
      const existing = [...document.scripts].find(script => script.src === src);
      let script = null;
      if (existing) initialize();
      else {
        script = document.createElement('script');
        script.async = true;
        script.src = src;
        script.addEventListener('load', initialize, { once: true, signal });
        document.head.appendChild(script);
      }

      return () => {
        // Also cancel a queued init if consent was withdrawn before tag.js ran.
        if (Array.isArray(window.ym?.a)) {
          // Keep the array: the live library hooks its push method.
          const queue = window.ym.a;
          for (let index = queue.length - 1; index >= 0; index--) {
            if (queue[index][0] === counterId) queue.splice(index, 1);
          }
        }
        if (initialized) window.ym(counterId, 'destruct');
        script?.remove();
        // The consent manager then reloads with analytics disabled.
      };
    },
  });
})();
