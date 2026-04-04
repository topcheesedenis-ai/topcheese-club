(function () {
  const params = new URLSearchParams(window.location.search);
  const isEditorMode = params.has("editor");

  const STORAGE_KEY = "cheese-combine-editor-overrides-v1";
  const root = document.querySelector("[data-landing-root]");
  if (!root) return;

  const FORMAT_PRESETS = {
    "": { label: "По умолчанию" },
    title: {
      label: "Заголовок",
      styles: {
        "font-family": "var(--font-display)",
        "font-size": "clamp(1.72rem, 3.8vw, 2.42rem)",
        "font-weight": "700",
        "line-height": "1.12",
        "letter-spacing": "-0.04em",
        "text-transform": "none",
        color: "var(--text)",
      },
    },
    descriptor: {
      label: "Дескриптор",
      styles: {
        "font-family": "var(--font-body)",
        "font-size": "clamp(1rem, 1.35vw, 1.08rem)",
        "font-weight": "500",
        "line-height": "1.58",
        "letter-spacing": "normal",
        "text-transform": "none",
        color: "rgba(236, 232, 223, 0.68)",
      },
    },
    subheading: {
      label: "Подзаголовок",
      styles: {
        "font-family": "var(--font-body)",
        "font-size": "1.06rem",
        "font-weight": "600",
        "line-height": "1.56",
        "letter-spacing": "normal",
        "text-transform": "none",
        color: "var(--text)",
      },
    },
    body: {
      label: "Обычный текст",
      styles: {
        "font-family": "var(--font-body)",
        "font-size": "clamp(1rem, 1.35vw, 1.08rem)",
        "font-weight": "400",
        "line-height": "1.74",
        "letter-spacing": "normal",
        "text-transform": "none",
        color: "rgba(236, 232, 223, 0.74)",
      },
    },
    kicker: {
      label: "Метка / kicker",
      styles: {
        "font-family": "var(--font-mono)",
        "font-size": "0.74rem",
        "font-weight": "700",
        "line-height": "1.3",
        "letter-spacing": "0.14em",
        "text-transform": "uppercase",
        color: "rgba(236, 232, 223, 0.52)",
      },
    },
    accent: {
      label: "Акцент",
      styles: {
        "font-family": "var(--font-display)",
        "font-size": "clamp(1.24rem, 3.3vw, 1.82rem)",
        "font-weight": "700",
        "line-height": "1.14",
        "letter-spacing": "-0.02em",
        "text-transform": "none",
        color: "var(--accent-text)",
      },
    },
    note: {
      label: "Заметка / подпись",
      styles: {
        "font-family": "var(--font-body)",
        "font-size": "0.92rem",
        "font-weight": "600",
        "line-height": "1.45",
        "letter-spacing": "normal",
        "text-transform": "none",
        color: "rgba(236, 232, 223, 0.64)",
      },
    },
  };
  const FORMAT_STYLE_KEYS = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-transform", "color"];

  const selectorSpecs = [
    { selector: ".hero__product", role: "Продукт" },
    { selector: ".hero__title", role: "Заголовок" },
    { selector: ".hero__lead p", role: "Hero текст" },
    { selector: ".block__title", role: "Заголовок блока" },
    { selector: ".block__lede", role: "Подзаголовок блока" },
    { selector: ".content-panel__kicker", role: "Метка панели" },
    { selector: ".content-panel__lead", role: "Лид панели" },
    { selector: ".text-flow p", role: "Абзац" },
    { selector: ".line-list li", role: "Пункт списка" },
    { selector: ".process-card__title", role: "Заголовок шага" },
    { selector: ".process-card__text", role: "Текст шага" },
    { selector: ".topic-card__title", role: "Заголовок карточки" },
    { selector: ".topic-card__text", role: "Текст карточки" },
    { selector: ".journey-card__kicker", role: "Этап" },
    { selector: ".journey-card__text", role: "Текст этапа" },
    { selector: ".author__name", role: "Имя автора" },
    { selector: ".cluster-lead", role: "Лид автора" },
    { selector: ".author__media", role: "Фото автора", kind: "media" },
    { selector: ".author__media-text", role: "Подпись к фото" },
    { selector: ".signal-line", role: "Акцентная строка" },
    { selector: ".result-chip", role: "Результат" },
    { selector: ".price-card__eyebrow", role: "Метка тарифа" },
    { selector: ".price-card__title", role: "Цена" },
    { selector: ".price-card__text", role: "Описание тарифа" },
    { selector: ".price-card__note", role: "Примечание тарифа" },
    { selector: ".pricing-proof__title", role: "Метка proof" },
    { selector: ".pricing-proof__item", role: "Proof" },
    { selector: ".pricing__meta", role: "Мета CTA" },
    { selector: ".pricing__note", role: "Примечание CTA" },
    { selector: ".cta-button span:last-child", role: "Текст кнопки" },
    { selector: ".sticky-cta__label", role: "Текст sticky CTA" },
    { selector: ".gc-popup__eyebrow", role: "Popup eyebrow" },
    { selector: ".gc-popup__title", role: "Popup заголовок" },
    { selector: ".gc-popup__text", role: "Popup подзаголовок" },
    { selector: ".gc-plan-card__title", role: "Popup тариф" },
    { selector: ".gc-plan-card__term", role: "Popup срок" },
    { selector: ".gc-plan-card__price", role: "Popup цена" },
    { selector: ".gc-plan-card__hint", role: "Popup описание" },
    { selector: ".gc-plan-card__feature p", role: "Popup подпись" },
    { selector: ".gc-popup__plans-note", role: "Popup заметка" },
    { selector: ".end-prompt__eyebrow", role: "End prompt eyebrow" },
    { selector: ".end-prompt__title", role: "End prompt заголовок" },
    { selector: ".end-prompt__text", role: "End prompt текст" },
    { selector: ".end-prompt__note", role: "End prompt заметка" },
    { selector: ".site-footer__copy", role: "Footer текст" },
    { selector: ".site-footer__company", role: "Footer компания" },
    { selector: ".site-footer__link", role: "Footer ссылка" },
  ];

  const originals = new Map();
  const overrides = isEditorMode ? readOverrides() : {};
  const elements = collectElements();
  if (!isEditorMode) {
    applyPublishedOverrides();
    return;
  }

  document.documentElement.classList.add("editor-mode");

  let selectedId = elements[0]?.id || null;
  let savedFileHandle = null;

  const panel = buildPanel();
  document.body.appendChild(panel);

  const refs = {
    select: panel.querySelector("[data-editor-select]"),
    chip: panel.querySelector("[data-editor-chip]"),
    textGroup: panel.querySelector("[data-editor-text-group]"),
    textarea: panel.querySelector("[data-editor-text]"),
    formatGroup: panel.querySelector("[data-editor-format-group]"),
    format: panel.querySelector("[data-editor-format]"),
    marginTop: panel.querySelector("[data-editor-mt]"),
    marginBottom: panel.querySelector("[data-editor-mb]"),
    translateX: panel.querySelector("[data-editor-tx]"),
    translateY: panel.querySelector("[data-editor-ty]"),
    widthRow: panel.querySelector("[data-editor-width-row]"),
    maxWidth: panel.querySelector("[data-editor-width]"),
    alignGroup: panel.querySelector("[data-editor-align-group]"),
    align: panel.querySelector("[data-editor-align]"),
    mtValue: panel.querySelector("[data-editor-mt-value]"),
    mbValue: panel.querySelector("[data-editor-mb-value]"),
    txValue: panel.querySelector("[data-editor-tx-value]"),
    tyValue: panel.querySelector("[data-editor-ty-value]"),
    widthValue: panel.querySelector("[data-editor-width-value]"),
    mediaGroup: panel.querySelector("[data-editor-media-group]"),
    mediaWidth: panel.querySelector("[data-editor-media-width]"),
    mediaHeight: panel.querySelector("[data-editor-media-height]"),
    mediaScale: panel.querySelector("[data-editor-media-scale]"),
    mediaPosX: panel.querySelector("[data-editor-media-pos-x]"),
    mediaPosY: panel.querySelector("[data-editor-media-pos-y]"),
    mediaWidthValue: panel.querySelector("[data-editor-media-width-value]"),
    mediaHeightValue: panel.querySelector("[data-editor-media-height-value]"),
    mediaScaleValue: panel.querySelector("[data-editor-media-scale-value]"),
    mediaPosXValue: panel.querySelector("[data-editor-media-pos-x-value]"),
    mediaPosYValue: panel.querySelector("[data-editor-media-pos-y-value]"),
    status: panel.querySelector("[data-editor-status]"),
    resetCurrent: panel.querySelector("[data-editor-reset-current]"),
    resetAll: panel.querySelector("[data-editor-reset-all]"),
    saveFile: panel.querySelector("[data-editor-save-file]"),
    download: panel.querySelector("[data-editor-download]"),
    copy: panel.querySelector("[data-editor-copy]"),
    import: panel.querySelector("[data-editor-import]"),
    importInput: panel.querySelector("[data-editor-import-input]"),
  };

  populateSelect();
  elements.forEach(({ element, id }) => {
    applyOverride(element, overrides[id] || {});
  });

  if (selectedId) {
    selectElement(selectedId);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (panel.contains(event.target)) return;
      const editable = event.target.closest("[data-editor-id]");
      if (!editable) return;
      event.preventDefault();
      event.stopPropagation();
      selectElement(editable.dataset.editorId);
    },
    true,
  );

  refs.select.addEventListener("change", () => {
    selectElement(refs.select.value);
  });

  refs.textarea.addEventListener("input", () => {
    const current = getCurrent();
    if (!current) return;
    ensureOverride(current.id).text = refs.textarea.value;
    applyOverride(current.element, overrides[current.id]);
    persistOverrides();
    setStatus("Текст обновлён");
  });

  refs.format.addEventListener("change", () => {
    const current = getCurrent();
    if (!current) return;
    const value = refs.format.value;
    if (value) {
      ensureOverride(current.id).format = value;
    } else if (overrides[current.id]) {
      delete overrides[current.id].format;
    }
    applyOverride(current.element, overrides[current.id] || {});
    persistOverrides();
    setStatus("Формат текста обновлён");
  });

  refs.marginTop.addEventListener("input", () => updateNumberField("mt", refs.marginTop.value));
  refs.marginBottom.addEventListener("input", () => updateNumberField("mb", refs.marginBottom.value));
  refs.translateX.addEventListener("input", () => updateNumberField("tx", refs.translateX.value));
  refs.translateY.addEventListener("input", () => updateNumberField("ty", refs.translateY.value));
  refs.maxWidth.addEventListener("input", () => updateNumberField("maxWidth", refs.maxWidth.value));
  refs.mediaWidth.addEventListener("input", () => updateNumberField("mediaWidth", refs.mediaWidth.value));
  refs.mediaHeight.addEventListener("input", () => updateNumberField("mediaHeight", refs.mediaHeight.value));
  refs.mediaScale.addEventListener("input", () => updateNumberField("mediaScale", refs.mediaScale.value));
  refs.mediaPosX.addEventListener("input", () => updateNumberField("mediaPosX", refs.mediaPosX.value));
  refs.mediaPosY.addEventListener("input", () => updateNumberField("mediaPosY", refs.mediaPosY.value));
  refs.align.addEventListener("change", () => {
    const current = getCurrent();
    if (!current) return;
    ensureOverride(current.id).align = refs.align.value;
    applyOverride(current.element, overrides[current.id]);
    persistOverrides();
    setStatus("Выравнивание обновлено");
  });

  refs.resetCurrent.addEventListener("click", () => {
    const current = getCurrent();
    if (!current) return;
    delete overrides[current.id];
    restoreOriginal(current.element, current.id);
    persistOverrides();
    syncForm(current.id);
    setStatus("Текущий элемент сброшен");
  });

  refs.resetAll.addEventListener("click", () => {
    Object.keys(overrides).forEach((key) => delete overrides[key]);
    elements.forEach(({ element, id }) => restoreOriginal(element, id));
    persistOverrides();
    if (selectedId) syncForm(selectedId);
    setStatus("Все правки сброшены");
  });

  refs.saveFile.addEventListener("click", async () => {
    const payload = buildPayload();

    if (typeof window.showSaveFilePicker !== "function") {
      downloadPayload(payload);
      setStatus("Браузер не умеет писать в файл напрямую. JSON скачан обычным способом");
      return;
    }

    try {
      if (!savedFileHandle) {
        savedFileHandle = await window.showSaveFilePicker({
          suggestedName: "landing-editor-overrides.json",
          types: [
            {
              description: "JSON overrides",
              accept: {
                "application/json": [".json"],
              },
            },
          ],
        });
      }

      const writable = await savedFileHandle.createWritable();
      await writable.write(payload);
      await writable.close();
      setStatus("JSON сохранён в выбранный файл");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("Сохранение отменено");
        return;
      }
      setStatus("Не удалось сохранить JSON в файл");
    }
  });

  refs.download.addEventListener("click", () => {
    const payload = buildPayload();
    downloadPayload(payload);
    setStatus("JSON скачан");
  });

  refs.copy.addEventListener("click", async () => {
    const payload = buildPayload();

    try {
      await navigator.clipboard.writeText(payload);
      setStatus("JSON скопирован в буфер");
    } catch (error) {
      setStatus("Не удалось скопировать JSON");
    }
  });

  refs.import.addEventListener("click", () => refs.importInput.click());
  refs.importInput.addEventListener("change", async () => {
    const file = refs.importInput.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = parsed?.elements || {};
      Object.keys(overrides).forEach((key) => delete overrides[key]);
      Object.entries(imported).forEach(([key, value]) => {
        overrides[key] = value;
      });
      elements.forEach(({ element, id }) => {
        restoreOriginal(element, id);
        applyOverride(element, overrides[id] || {});
      });
      persistOverrides();
      if (selectedId) syncForm(selectedId);
      setStatus("JSON загружен");
    } catch (error) {
      setStatus("Не удалось загрузить JSON");
    }
    refs.importInput.value = "";
  });

  function collectElements() {
    const items = [];
    const seen = new Set();
    const counters = new Map();

    selectorSpecs.forEach((spec) => {
      document.querySelectorAll(spec.selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        if (seen.has(element)) return;
        seen.add(element);

        const context = getContextLabel(element);
        const keyBase = `${slug(context)}-${slug(spec.role)}`;
        const nextCount = (counters.get(keyBase) || 0) + 1;
        counters.set(keyBase, nextCount);
        const id = `${keyBase}-${String(nextCount).padStart(2, "0")}`;
        const label = `${context} / ${spec.role} ${nextCount}`;
        const kind = spec.kind || "text";

        element.dataset.editorId = id;
        element.dataset.editorLabel = label;
        originals.set(id, {
          text: kind === "text" ? getTextValue(element) : null,
        });

        items.push({ id, label, element, kind });
      });
    });

    return items;
  }

  async function applyPublishedOverrides() {
    try {
      const response = await window.fetch("./landing-editor-overrides.json", { cache: "no-store" });
      if (!response.ok) return;

      const payload = await response.json();
      const fileOverrides = payload?.elements;
      if (!fileOverrides || typeof fileOverrides !== "object") return;

      Object.assign(overrides, fileOverrides);

      elements.forEach(({ element, id }) => {
        applyOverride(element, overrides[id] || {});
      });
    } catch (error) {
      /* no-op: live landing should stay usable even if overrides file is missing */
    }
  }

  function buildPanel() {
    const aside = document.createElement("aside");
    aside.className = "landing-editor";
    aside.setAttribute("data-editor-ui", "true");
    aside.innerHTML = `
      <div class="landing-editor__header">
        <div class="landing-editor__eyebrow">Editor Mode</div>
        <div class="landing-editor__title">Редактор текста и композиции</div>
        <p class="landing-editor__hint">Кликните по тексту или фото на странице. Изменения применяются сразу и сохраняются локально в браузере.</p>
      </div>

      <div class="landing-editor__toolbar">
        <label class="landing-editor__group">
          <span class="landing-editor__label">Элемент</span>
          <select class="landing-editor__select" data-editor-select></select>
        </label>
        <div class="landing-editor__chip" data-editor-chip>Выбранный элемент: <strong>—</strong></div>
      </div>

      <div class="landing-editor__body">
        <label class="landing-editor__group" data-editor-text-group>
          <span class="landing-editor__label">Текст</span>
          <textarea class="landing-editor__textarea" data-editor-text placeholder="Меняйте текст здесь. Новая строка даст перенос на странице."></textarea>
          <span class="landing-editor__subhint">Для разбиения на строки просто жмите Enter внутри поля.</span>
        </label>

        <label class="landing-editor__group" data-editor-format-group>
          <span class="landing-editor__label">Формат текста</span>
          <select class="landing-editor__align" data-editor-format>
            ${Object.entries(FORMAT_PRESETS)
              .map(([value, preset]) => `<option value="${value}">${preset.label}</option>`)
              .join("")}
          </select>
          <span class="landing-editor__subhint">Можно быстро превратить элемент в заголовок, дескриптор, подзаголовок, обычный текст, метку или заметку.</span>
        </label>

        <div class="landing-editor__group">
          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Отступ сверху</span>
              <span class="landing-editor__value" data-editor-mt-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-mt type="range" min="-80" max="160" step="2" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Отступ снизу</span>
              <span class="landing-editor__value" data-editor-mb-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-mb type="range" min="-80" max="160" step="2" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Сдвиг по X</span>
              <span class="landing-editor__value" data-editor-tx-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-tx type="range" min="-360" max="360" step="2" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Поднять / опустить</span>
              <span class="landing-editor__value" data-editor-ty-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-ty type="range" min="-360" max="360" step="2" value="0" />
          </div>

          <div class="landing-editor__slider-row" data-editor-width-row>
            <div class="landing-editor__slider-head">
              <span>Макс. ширина текста</span>
              <span class="landing-editor__value" data-editor-width-value>auto</span>
            </div>
            <input class="landing-editor__slider" data-editor-width type="range" min="0" max="1000" step="10" value="0" />
          </div>
        </div>

        <label class="landing-editor__group" data-editor-align-group>
          <span class="landing-editor__label">Выравнивание</span>
          <select class="landing-editor__align" data-editor-align>
            <option value="">По умолчанию</option>
            <option value="left">Влево</option>
            <option value="center">По центру</option>
            <option value="right">Вправо</option>
          </select>
        </label>

        <div class="landing-editor__group" data-editor-media-group hidden>
          <span class="landing-editor__label">Фото</span>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Ширина блока</span>
              <span class="landing-editor__value" data-editor-media-width-value>auto</span>
            </div>
            <input class="landing-editor__slider" data-editor-media-width type="range" min="0" max="560" step="4" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Высота кадра</span>
              <span class="landing-editor__value" data-editor-media-height-value>auto</span>
            </div>
            <input class="landing-editor__slider" data-editor-media-height type="range" min="0" max="760" step="4" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Масштаб фото</span>
              <span class="landing-editor__value" data-editor-media-scale-value>100%</span>
            </div>
            <input class="landing-editor__slider" data-editor-media-scale type="range" min="60" max="180" step="1" value="100" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Позиция фото по X</span>
              <span class="landing-editor__value" data-editor-media-pos-x-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-media-pos-x type="range" min="-360" max="360" step="2" value="0" />
          </div>

          <div class="landing-editor__slider-row">
            <div class="landing-editor__slider-head">
              <span>Позиция фото по Y</span>
              <span class="landing-editor__value" data-editor-media-pos-y-value>0 px</span>
            </div>
            <input class="landing-editor__slider" data-editor-media-pos-y type="range" min="-360" max="360" step="2" value="0" />
          </div>

          <span class="landing-editor__subhint">Для фото можно отдельно двигать блок, менять размер кадра и смещать сам портрет внутри кадра.</span>
        </div>
      </div>

      <div class="landing-editor__footer">
        <div class="landing-editor__buttons">
          <button class="landing-editor__button" type="button" data-editor-reset-current>Сбросить элемент</button>
          <button class="landing-editor__button" type="button" data-editor-reset-all>Сбросить всё</button>
          <button class="landing-editor__button landing-editor__button--primary" type="button" data-editor-save-file>Сохранить в файл</button>
          <button class="landing-editor__button landing-editor__button--primary" type="button" data-editor-download>Скачать JSON</button>
          <button class="landing-editor__button" type="button" data-editor-copy>Скопировать JSON</button>
          <button class="landing-editor__button" type="button" data-editor-import>Загрузить JSON</button>
          <input data-editor-import-input type="file" accept="application/json" hidden />
        </div>
        <p class="landing-editor__status" data-editor-status>Готово к редактированию.</p>
      </div>
    `;

    return aside;
  }

  function getContextLabel(element) {
    const section = element.closest("section[id]");
    if (section) return section.id;
    if (element.closest(".gc-popup")) return "popup";
    if (element.closest(".end-prompt")) return "end-prompt";
    if (element.closest(".sticky-cta")) return "sticky-cta";
    if (element.closest(".site-footer")) return "footer";
    return "common";
  }

  function populateSelect() {
    refs.select.innerHTML = elements
      .map(({ id, label }) => `<option value="${id}">${label}</option>`)
      .join("");
  }

  function selectElement(id) {
    selectedId = id;
    elements.forEach(({ element, id: currentId }) => {
      element.classList.toggle("is-editor-selected", currentId === id);
    });
    refs.select.value = id;
    syncForm(id);
    const current = getCurrent();
    current?.element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function syncForm(id) {
    const current = elements.find((item) => item.id === id);
    if (!current) return;
    const override = overrides[id] || {};
    const isMedia = current.kind === "media";
    refs.chip.innerHTML = `Выбранный элемент: <strong>${current.label}</strong>`;
    refs.textarea.value = isMedia ? "" : override.text ?? originals.get(id)?.text ?? "";
    refs.format.value = override.format ?? "";
    refs.marginTop.value = override.mt ?? 0;
    refs.marginBottom.value = override.mb ?? 0;
    refs.translateX.value = override.tx ?? 0;
    refs.translateY.value = override.ty ?? 0;
    refs.maxWidth.value = override.maxWidth ?? 0;
    refs.align.value = override.align ?? "";
    refs.mediaWidth.value = override.mediaWidth ?? 0;
    refs.mediaHeight.value = override.mediaHeight ?? 0;
    refs.mediaScale.value = override.mediaScale ?? 100;
    refs.mediaPosX.value = override.mediaPosX ?? 0;
    refs.mediaPosY.value = override.mediaPosY ?? 0;
    refs.textGroup.hidden = isMedia;
    refs.formatGroup.hidden = isMedia;
    refs.widthRow.hidden = isMedia;
    refs.alignGroup.hidden = isMedia;
    refs.mediaGroup.hidden = !isMedia;
    syncValueLabels();
  }

  function syncValueLabels() {
    refs.mtValue.textContent = `${refs.marginTop.value} px`;
    refs.mbValue.textContent = `${refs.marginBottom.value} px`;
    refs.txValue.textContent = `${refs.translateX.value} px`;
    refs.tyValue.textContent = `${refs.translateY.value} px`;
    refs.widthValue.textContent = Number(refs.maxWidth.value) > 0 ? `${refs.maxWidth.value} px` : "auto";
    refs.mediaWidthValue.textContent = Number(refs.mediaWidth.value) > 0 ? `${refs.mediaWidth.value} px` : "auto";
    refs.mediaHeightValue.textContent = Number(refs.mediaHeight.value) > 0 ? `${refs.mediaHeight.value} px` : "auto";
    refs.mediaScaleValue.textContent = `${refs.mediaScale.value}%`;
    refs.mediaPosXValue.textContent = `${refs.mediaPosX.value} px`;
    refs.mediaPosYValue.textContent = `${refs.mediaPosY.value} px`;
  }

  function updateNumberField(key, value) {
    const current = getCurrent();
    if (!current) return;
    const normalized = Number(value);
    ensureOverride(current.id)[key] = normalized;
    applyOverride(current.element, overrides[current.id]);
    syncValueLabels();
    persistOverrides();
    setStatus("Отступы обновлены");
  }

  function getCurrent() {
    return elements.find((item) => item.id === selectedId) || null;
  }

  function ensureOverride(id) {
    if (!overrides[id]) {
      overrides[id] = {};
    }
    return overrides[id];
  }

  function applyOverride(element, override) {
    if (override.text != null) {
      setTextValue(element, override.text);
    }

    applyFormatPreset(element, override.format);
    setStyleValue(element, "margin-top", override.mt);
    setStyleValue(element, "margin-bottom", override.mb);
    setStyleValue(element, "max-width", override.maxWidth, "px", (value) => Number(value) > 0);

    const tx = typeof override.tx === "number" ? override.tx : 0;
    const ty = typeof override.ty === "number" ? override.ty : 0;
    if (tx !== 0 || ty !== 0) {
      element.style.transform = `translate(${tx}px, ${ty}px)`;
    } else {
      element.style.removeProperty("transform");
    }

    if (override.align) {
      element.style.textAlign = override.align;
    } else {
      element.style.removeProperty("text-align");
    }

    if (element.classList.contains("author__media")) {
      applyMediaOverride(element, override);
    }
  }

  function restoreOriginal(element, id) {
    const original = originals.get(id);
    if (!original) return;
    if (original.text != null) {
      setTextValue(element, original.text);
    }
    applyFormatPreset(element, "");
    element.style.removeProperty("margin-top");
    element.style.removeProperty("margin-bottom");
    element.style.removeProperty("max-width");
    element.style.removeProperty("width");
    element.style.removeProperty("transform");
    element.style.removeProperty("text-align");

    if (element.classList.contains("author__media")) {
      resetMediaOverride(element);
    }
  }

  function applyFormatPreset(element, formatKey = "") {
    FORMAT_STYLE_KEYS.forEach((property) => {
      element.style.removeProperty(property);
    });

    const preset = FORMAT_PRESETS[formatKey];
    if (!preset?.styles) return;

    Object.entries(preset.styles).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  function setStyleValue(element, property, value, unit = "px", predicate = (entry) => Number(entry) !== 0) {
    if (typeof value === "number" && predicate(value)) {
      element.style.setProperty(property, `${value}${unit}`);
      return;
    }

    element.style.removeProperty(property);
  }

  function getTextValue(element) {
    if (element.classList.contains("hero__title")) {
      const lines = [...element.querySelectorAll(".hero__title-line")].map((line) => line.textContent.trim());
      return lines.join("\n");
    }

    return decodeBreaks(element.innerHTML);
  }

  function setTextValue(element, value) {
    if (element.classList.contains("hero__title")) {
      const lines = String(value)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const markup = (lines.length ? lines : [""]).map((line) => `<span class="hero__title-line">${escapeHtml(line)}</span>`).join("");
      element.innerHTML = markup;
      return;
    }

    element.innerHTML = escapeHtml(String(value)).replace(/\n/g, "<br />");
  }

  function decodeBreaks(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  function buildPayload() {
    return JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        elements: overrides,
      },
      null,
      2,
    );
  }

  function downloadPayload(payload) {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "landing-editor-overrides.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function applyMediaOverride(element, override) {
    const imageWrap = element.querySelector(".author__image-wrap");
    const image = element.querySelector(".author__image");

    setStyleValue(element, "width", override.mediaWidth, "px", (value) => Number(value) > 0);
    if (typeof override.mediaWidth === "number" && override.mediaWidth > 0) {
      element.style.setProperty("max-width", `${override.mediaWidth}px`);
    }

    if (imageWrap) {
      if (typeof override.mediaHeight === "number" && override.mediaHeight > 0) {
        imageWrap.style.setProperty("height", `${override.mediaHeight}px`);
        imageWrap.style.setProperty("aspect-ratio", "auto");
      } else {
        imageWrap.style.removeProperty("height");
        imageWrap.style.removeProperty("aspect-ratio");
      }
    }

    if (image) {
      const scale = typeof override.mediaScale === "number" ? override.mediaScale / 100 : 1;
      const posX = typeof override.mediaPosX === "number" ? override.mediaPosX : 0;
      const posY = typeof override.mediaPosY === "number" ? override.mediaPosY : 0;

      if (scale !== 1 || posX !== 0 || posY !== 0) {
        image.style.setProperty("transform", `translate(${posX}px, ${posY}px) scale(${scale})`);
        image.style.setProperty("transform-origin", "center top");
      } else {
        image.style.removeProperty("transform");
        image.style.removeProperty("transform-origin");
      }
    }
  }

  function resetMediaOverride(element) {
    const imageWrap = element.querySelector(".author__image-wrap");
    const image = element.querySelector(".author__image");

    if (imageWrap) {
      imageWrap.style.removeProperty("height");
      imageWrap.style.removeProperty("aspect-ratio");
    }

    if (image) {
      image.style.removeProperty("transform");
      image.style.removeProperty("transform-origin");
    }
  }

  function persistOverrides() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (error) {
      setStatus("Не удалось сохранить правки локально");
    }
  }

  function readOverrides() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function setStatus(text) {
    refs.status.textContent = text;
  }

  function slug(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
