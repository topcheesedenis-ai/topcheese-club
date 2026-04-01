const landing = document.querySelector("[data-landing-root]");

if (landing) {
  const SESSION_KEYS = {
    gcIntent: "cheese-combine-gc-intent",
    endPromptShown: "cheese-combine-end-prompt-shown",
  };
  const revealElements = [...landing.querySelectorAll("[data-reveal]")];
  const stickyCta = landing.querySelector("[data-sticky-cta]");
  const hero = landing.querySelector(".hero");
  const finalTrigger = landing.querySelector("#cta") || landing.querySelector(".site-footer");
  const gcPopup = document.querySelector("[data-gc-popup]");
  const gcPopupDialog = gcPopup?.querySelector(".gc-popup__dialog");
  const gcPopupTitle = gcPopup?.querySelector(".gc-popup__title");
  const gcPopupOpeners = [...document.querySelectorAll("[data-gc-popup-open]")];
  const gcPopupClosers = [...document.querySelectorAll("[data-gc-popup-close]")];
  const gcPopupBack = gcPopup?.querySelector("[data-gc-popup-back]");
  const gcPopupText = gcPopup?.querySelector("[data-gc-popup-text]");
  const gcPopupViews = {
    plans: gcPopup?.querySelector('[data-gc-view="plans"]'),
    form: gcPopup?.querySelector('[data-gc-view="form"]'),
  };
  const gcPopupPlanButtons = [...document.querySelectorAll("[data-plan-button]")];
  const endPrompt = document.querySelector("[data-end-prompt]");
  const endPromptDialog = endPrompt?.querySelector(".end-prompt__dialog");
  const endPromptGoButton = endPrompt?.querySelector("[data-end-prompt-go]");
  const endPromptClosers = [...document.querySelectorAll("[data-end-prompt-close]")];
  const gcWidgetMounts = {
    month: gcPopup?.querySelector('[data-gc-widget="month"]'),
    year: gcPopup?.querySelector('[data-gc-widget="year"]'),
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canObserve = "IntersectionObserver" in window;
  let lastFocusedGcElement = null;
  let lastFocusedEndPromptElement = null;
  let endPromptTimer = null;
  let gcIntentRegistered = readSessionFlag(SESSION_KEYS.gcIntent);
  let endPromptShown = readSessionFlag(SESSION_KEYS.endPromptShown);

  function readSessionFlag(key) {
    try {
      return window.sessionStorage.getItem(key) === "1";
    } catch (error) {
      return false;
    }
  }

  function writeSessionFlag(key) {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch (error) {
      /* noop */
    }
  }

  function syncBodyModalState() {
    const hasActiveModal =
      gcPopup?.classList.contains("gc-popup--visible") ||
      endPrompt?.classList.contains("end-prompt--visible");

    document.body.classList.toggle("body--modal-open", Boolean(hasActiveModal));
  }

  function clearEndPromptTimer() {
    if (!endPromptTimer) return;
    window.clearTimeout(endPromptTimer);
    endPromptTimer = null;
  }

  function closeEndPrompt({ restoreFocus = true } = {}) {
    if (!endPrompt) return;
    endPrompt.classList.remove("end-prompt--visible");
    endPrompt.setAttribute("aria-hidden", "true");
    syncBodyModalState();

    if (restoreFocus && lastFocusedEndPromptElement instanceof HTMLElement) {
      lastFocusedEndPromptElement.focus();
    }
  }

  function openEndPrompt() {
    if (
      !endPrompt ||
      !endPromptDialog ||
      endPromptShown ||
      gcIntentRegistered ||
      gcPopup?.classList.contains("gc-popup--visible")
    ) {
      return;
    }

    clearEndPromptTimer();
    endPromptShown = true;
    writeSessionFlag(SESSION_KEYS.endPromptShown);
    lastFocusedEndPromptElement = document.activeElement;
    endPrompt.classList.add("end-prompt--visible");
    endPrompt.setAttribute("aria-hidden", "false");
    syncBodyModalState();
    window.requestAnimationFrame(() => endPromptDialog.focus());
  }

  function scheduleEndPrompt() {
    if (
      !endPrompt ||
      endPromptShown ||
      gcIntentRegistered ||
      gcPopup?.classList.contains("gc-popup--visible") ||
      endPrompt.classList.contains("end-prompt--visible")
    ) {
      return;
    }

    clearEndPromptTimer();
    endPromptTimer = window.setTimeout(() => {
      openEndPrompt();
    }, 700);
  }

  function registerGcIntent() {
    if (!gcIntentRegistered) {
      gcIntentRegistered = true;
      writeSessionFlag(SESSION_KEYS.gcIntent);
    }

    clearEndPromptTimer();

    if (endPrompt?.classList.contains("end-prompt--visible")) {
      closeEndPrompt({ restoreFocus: false });
    }
  }

  if (reduceMotion || !canObserve) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  if (stickyCta && hero) {
    const toggleStickyState = (isVisible) => {
      stickyCta.classList.toggle("sticky-cta--visible", isVisible);
    };

    if (reduceMotion || !canObserve) {
      const onScroll = () => {
        toggleStickyState(window.scrollY > hero.offsetHeight * 0.72);
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      const heroObserver = new IntersectionObserver(
        ([entry]) => {
          toggleStickyState(!entry.isIntersecting);
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -18% 0px",
        },
      );

      heroObserver.observe(hero);
    }
  }

  if (endPrompt && finalTrigger) {
    if (reduceMotion || !canObserve) {
      const onScroll = () => {
        if (gcIntentRegistered || endPromptShown) {
          clearEndPromptTimer();
          return;
        }

        const triggerTop = finalTrigger.getBoundingClientRect().top;
        if (triggerTop <= window.innerHeight * 1.08) {
          scheduleEndPrompt();
        } else {
          clearEndPromptTimer();
        }
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      const endPromptObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            scheduleEndPrompt();
            return;
          }

          clearEndPromptTimer();
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px 18% 0px",
        },
      );

      endPromptObserver.observe(finalTrigger);
    }
  }

  if (gcPopup && gcPopupDialog && gcPopupOpeners.length) {
    const gcWidgets = {
      month: {
        mount: gcWidgetMounts.month,
        scriptId: "bef41d450f0b2e4024017ba236ec0881c80ffbf7",
        startEvent: "StartWidgetbef41d450f0b2e4024017ba236ec0881c80ffbf7",
        src: "https://academy.topcheese.online/pl/lite/widget/script?id=1572173",
        title: "Месячная подписка",
        subtitle: "",
      },
      year: {
        mount: gcWidgetMounts.year,
        scriptId: "1070c238acc85374e6b33ab9a01978184aa73c74",
        startEvent: "StartWidget1070c238acc85374e6b33ab9a01978184aa73c74",
        src: "https://academy.topcheese.online/pl/lite/widget/script?id=1572217",
        title: "Годовая подписка",
        subtitle: "",
      },
    };
    const gcWidgetLoaded = {
      month: false,
      year: false,
    };
    const gcWidgetLoading = {
      month: false,
      year: false,
    };
    const gcWidgetShouldStart = {
      month: false,
      year: false,
    };
    let gcWidgetWarmupTimer = null;
    const gcPopupDefaultTitle = gcPopupTitle?.innerHTML || "";
    const gcPopupDefaultText = gcPopupText?.textContent || "";

    const startGcWidget = (plan) => {
      const widget = gcWidgets[plan];
      if (!widget?.startEvent) return;
      gcWidgetShouldStart[plan] = false;
      document.dispatchEvent(new Event(widget.startEvent));
    };

    const setGcPopupView = (view, plan = null) => {
      const isPlans = view === "plans";
      gcPopup.classList.toggle("gc-popup--form-mode", !isPlans);

      if (gcPopupViews.plans) {
        gcPopupViews.plans.hidden = !isPlans;
      }

      if (gcPopupViews.form) {
        gcPopupViews.form.hidden = isPlans;
      }

      if (gcPopupBack) {
        gcPopupBack.hidden = isPlans;
      }

      if (gcPopupTitle) {
        gcPopupTitle.innerHTML = isPlans
          ? gcPopupDefaultTitle
          : gcWidgets[plan]?.title || "Оформление доступа";
      }

      if (gcPopupText) {
        gcPopupText.textContent = isPlans
          ? gcPopupDefaultText
          : gcWidgets[plan]?.subtitle || "";
      }

      Object.entries(gcWidgetMounts).forEach(([key, mount]) => {
        if (!mount) return;
        mount.hidden = isPlans || key !== plan;
      });

      gcPopup.scrollTop = 0;
      gcPopupDialog.scrollTop = 0;
    };

    const loadGcWidget = (plan, { autostart = true } = {}) => {
      const widget = gcWidgets[plan];
      if (!widget || !widget.mount) return;

      if (autostart) {
        gcWidgetShouldStart[plan] = true;
      }

      if (gcWidgetLoaded[plan]) {
        if (autostart) {
          startGcWidget(plan);
        }
        return;
      }

      if (gcWidgetLoading[plan]) return;

      gcWidgetLoading[plan] = true;

      const script = document.createElement("script");
      script.id = widget.scriptId;
      script.src = widget.src;
      script.addEventListener("load", () => {
        gcWidgetLoading[plan] = false;
        gcWidgetLoaded[plan] = true;
        if (gcWidgetShouldStart[plan]) {
          startGcWidget(plan);
        }
      });
      script.addEventListener("error", () => {
        gcWidgetLoading[plan] = false;
      });
      widget.mount.appendChild(script);
    };

    const warmGcWidgets = () => {
      if (gcWidgetWarmupTimer) {
        window.clearTimeout(gcWidgetWarmupTimer);
      }

      loadGcWidget("month", { autostart: false });
      gcWidgetWarmupTimer = window.setTimeout(() => {
        loadGcWidget("year", { autostart: false });
      }, 140);
    };

    const openGcPopup = () => {
      registerGcIntent();
      lastFocusedGcElement = document.activeElement;
      setGcPopupView("plans");
      gcPopup.classList.add("gc-popup--visible");
      gcPopup.setAttribute("aria-hidden", "false");
      syncBodyModalState();
      warmGcWidgets();
      window.requestAnimationFrame(() => gcPopupDialog.focus());
    };

    const closeGcPopup = () => {
      if (gcWidgetWarmupTimer) {
        window.clearTimeout(gcWidgetWarmupTimer);
        gcWidgetWarmupTimer = null;
      }
      setGcPopupView("plans");
      gcPopup.classList.remove("gc-popup--visible");
      gcPopup.setAttribute("aria-hidden", "true");
      syncBodyModalState();

      if (lastFocusedGcElement instanceof HTMLElement) {
        lastFocusedGcElement.focus();
      }
    };

    gcPopupOpeners.forEach((button) => {
      button.addEventListener("pointerdown", warmGcWidgets, { passive: true });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openGcPopup();
      });
    });

    gcPopupClosers.forEach((button) => {
      button.addEventListener("click", closeGcPopup);
    });

    if (gcPopupBack) {
      gcPopupBack.addEventListener("click", () => {
        setGcPopupView("plans");
      });
    }

    gcPopupPlanButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const plan = button.dataset.plan;
        if (!plan) return;
        setGcPopupView("form", plan);
        window.requestAnimationFrame(() => loadGcWidget(plan));
      });
    });

    if (endPromptGoButton) {
      endPromptGoButton.addEventListener("click", () => {
        closeEndPrompt({ restoreFocus: false });
        openGcPopup();
      });
    }

    endPromptClosers.forEach((button) => {
      button.addEventListener("click", () => {
        clearEndPromptTimer();
        closeEndPrompt();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (gcPopup.classList.contains("gc-popup--visible")) {
        closeGcPopup();
        return;
      }

      if (endPrompt?.classList.contains("end-prompt--visible")) {
        closeEndPrompt();
      }
    });
  }
}
