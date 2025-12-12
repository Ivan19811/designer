// js/design/widgets/shadows/shadows-widget.js
// Головний віджет "Тіні / Глибина" для панелі "Дизайн"
//
// Підтримує:
//  - зовнішню тінь (box-shadow)
//  - окрему внутрішню тінь (inset box-shadow)
//  - режим "Немає тіні", який тільки вимикає, але не стирає налаштування
//  - окремий колір для outer/inner
//  - спільні повзунки геометрії (керують тим шаром, який зараз редагується)

const SHADOWS_SUBSECTIONS_STATE_KEY = 'st_design_shadows_subsections_v1';
const SHADOWS_DEBUG = true;

function shLog() {
  if (!SHADOWS_DEBUG) return;
  const args = Array.prototype.slice.call(arguments);
  args.unshift('[shadows]');
  console.log.apply(console, args);
}

// --- збереження/зчитування стану під-акордеонів --- //
function loadShadowsSubsectionsState() {
  try {
    const raw = window.localStorage.getItem(SHADOWS_SUBSECTIONS_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('[shadows] Failed to load subsections state', err);
    return {};
  }
}

function saveShadowsSubsectionsState(state) {
  try {
    window.localStorage.setItem(
      SHADOWS_SUBSECTIONS_STATE_KEY,
      JSON.stringify(state || {})
    );
  } catch (err) {
    console.warn('[shadows] Failed to save subsections state', err);
  }
}

// --- допоміжне: HEX -> rgba(...) --- //
function hexToRgba(hex, opacity01) {
  if (!hex) return `rgba(0,0,0,${opacity01})`;
  let c = hex.replace('#', '').trim();

  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) {
    return `rgba(0,0,0,${opacity01})`;
  }
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${opacity01})`;
}

/**
 * Головний ініціалізатор віджета "Тіні / Глибина".
 *
 * @param {HTMLElement} host       - контейнер у панелі Дизайну
 * @param {Function} getSelection  - функція конструктора, яка повертає поточне виділення
 *                                  { type: 'block'|'section'|'none', elements: HTMLElement[] }
 */
export function initShadowsWidget(host, getSelection) {
  if (!host) return;

  // --- ГЛОБАЛЬНИЙ СТАН ВІДЖЕТА --- //
  // Ми тримаємо окремо налаштування outer/inner та "останній" стан для відновлення.
  let shadowsState = {
    outer: {
      enabled: true,
      preset: 'soft',      // 'soft' | 'accent' | 'outline' | 'glow' | 'custom'
      color: '#000000',
      opacity: 40,         // 0–100
      offsetX: 0,
      offsetY: 12,
      blur: 24,
      spread: 0
    },
    inner: {
      enabled: false,
      color: '#000000',
      opacity: 40,
      offsetX: 0,
      offsetY: 6,
      blur: 16,
      spread: 0
    },
    // тимчасове вимкнення зовнішньої тіні (для чекбокса "Немає тіні")
    outerDisabled: false,
    // який шар зараз редагуємо повзунками: 'outer' | 'inner'
    editTarget: 'outer',
    // збережений стан зовнішньої тіні (щоб відновити після "Немає тіні")
    lastOuterSnapshot: null
  };

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Тіні / Глибина</span>
        <span class="design-section__header-subtitle">
          Об'єм, світіння, внутрішня тінь
        </span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>

    <div class="design-section__body">
      <!-- КОМУ ЗАСТОСОВУЄМО -->
      <div class="design-field">
        <div class="design-field__label">Кому застосувати тіні</div>
        <div class="design-subnote" data-shadows-summary>
          Тіні застосовуються до поточного виділення на полотні
          (Canvas або Дерево). Виділи блоки, секції, текст, зображення
          чи лінії — і налаштовуй глибину.
        </div>
      </div>

      <div class="design-border-subsections">

        <!-- 1. РЕЖИМ ТІНІ / ПРЕСЕТИ -->
        <div class="design-border-subsection" data-shadows-subsection-id="mode">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">Режим тіні</span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <div class="design-field">
              <div class="design-field__label">Зовнішня тінь (box-shadow)</div>
              <div class="design-pill-group" data-shadow-presets>
                <button type="button" class="design-pill is-active" data-sh-preset="soft">
                  М'яка
                </button>
                <button type="button" class="design-pill" data-sh-preset="accent">
                  Акцентна
                </button>
                <button type="button" class="design-pill" data-sh-preset="outline">
                  Обводка
                </button>
                <button type="button" class="design-pill" data-sh-preset="glow">
                  Світіння
                </button>
                <button type="button" class="design-pill" data-sh-preset="custom">
                  Кастом
                </button>
              </div>

              <label class="design-border-flag" style="margin-top:8px;">
                <input type="checkbox" data-shadow-outer-none />
                <span>Немає зовнішньої тіні</span>
              </label>

              <p class="design-subnote">
                Якщо увімкнено "Немає тіні" — ми ховаємо зовнішню тінь, але
                зберігаємо всі налаштування. При вимкненні чекбокса тінь
                повертається у тому самому вигляді.
              </p>
            </div>

            <div class="design-field">
              <div class="design-field__label">Внутрішня тінь (inset)</div>
              <div class="design-pill-group">
                <button type="button" class="design-pill" data-shadow-inner-toggle>
                  Внутрішня тінь
                </button>
                <label class="design-border-flag" style="margin-left:8px;">
                  <input type="checkbox" data-shadow-inner-none />
                  <span>Немає внутрішньої тіні</span>
                </label>
              </div>
              <p class="design-subnote">
                Внутрішня тінь малюється через inset box-shadow. Коли
                активуєш кнопку "Внутрішня тінь", усі повзунки нижче
                редагують саме внутрішню тінь.
              </p>
            </div>
          </div>
        </div>

        <!-- 2. ГЕОМЕТРІЯ -->
        <div class="design-border-subsection" data-shadows-subsection-id="geometry">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">
              Геометрія тіні (<span data-shadow-edit-target-label>зовнішня</span>)
            </span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <div class="design-field">
              <div class="design-field__label">Зсув по X (горизонталь)</div>
              <input type="range" min="-64" max="64" value="0" data-shadow-geom="offsetX" />
            </div>

            <div class="design-field">
              <div class="design-field__label">Зсув по Y (вертикаль)</div>
              <input type="range" min="-64" max="64" value="12" data-shadow-geom="offsetY" />
            </div>

            <div class="design-field">
              <div class="design-field__label">Розмиття (blur)</div>
              <input type="range" min="0" max="128" value="24" data-shadow-geom="blur" />
            </div>

            <div class="design-field">
              <div class="design-field__label">Розмах (spread)</div>
              <input type="range" min="-64" max="64" value="0" data-shadow-geom="spread" />
            </div>
          </div>
        </div>

        <!-- 3. КОЛІР ТІНІ -->
        <div class="design-border-subsection" data-shadows-subsection-id="color">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">Колір тіні</span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <div class="design-field">
              <div class="design-field__label">Зовнішня тінь</div>
              <div class="builder__field builder__field--inline">
                <label>
                  <span class="builder__field-label">Колір</span>
                  <input type="color" value="#000000" data-shadow-color="outer" />
                </label>
                <label>
                  <span class="builder__field-label">Прозорість</span>
                  <input type="range" min="0" max="100" value="40" data-shadow-opacity="outer" />
                </label>
              </div>
            </div>

            <div class="design-field">
              <div class="design-field__label">Внутрішня тінь</div>
              <div class="builder__field builder__field--inline">
                <label>
                  <span class="builder__field-label">Колір</span>
                  <input type="color" value="#000000" data-shadow-color="inner" />
                </label>
                <label>
                  <span class="builder__field-label">Прозорість</span>
                  <input type="range" min="0" max="100" value="40" data-shadow-opacity="inner" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. ЕФЕКТИ (заглушка на майбутнє) -->
        <div class="design-border-subsection" data-shadows-subsection-id="effects">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">Ефекти / Світіння / Обводка</span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <p class="design-subnote">
              Тут з'являться додаткові ефекти (подвійні тіні, багатошаровий глоу,
              неон тощо). Поки що це заглушка.
            </p>
          </div>
        </div>

      </div>

      <div class="design-field">
        <div class="design-border-apply-row">
          <button type="button" class="design-button" data-shadows="apply">
            Застосувати тіні
          </button>
          <span class="design-border-apply-note">
            Тіні застосовуються автоматично при зміні будь-якого параметра,
            але цю кнопку можна використовувати як «оновити ще раз».
          </span>
        </div>
      </div>
    </div>
  `;

  // --- верхній акардеон --- //
  const headerBtn = sectionEl.querySelector('.design-section__header');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      sectionEl.classList.toggle('is-open');
    });
  }

  const summaryEl = sectionEl.querySelector('[data-shadows-summary]');
  const editTargetLabelEl = sectionEl.querySelector('[data-shadow-edit-target-label]');

  // --- допоміжні функції роботи з таргетами --- //
  function getShadowTargets() {
    if (typeof getSelection === 'function') {
      const sel = getSelection();
      if (sel && Array.isArray(sel.elements)) {
        return sel.elements;
      }
    }
    return [];
  }

  function updateTargetsSummary() {
    if (!summaryEl) return;
    const targets = getShadowTargets();
    const count = targets.length;

    if (!count) {
      summaryEl.textContent =
        'Наразі нічого не вибрано. Виділи на полотні блок, секцію, текст, зображення чи лінію — тіні будуть застосовані до поточного виділення.';
      return;
    }

    if (count === 1) {
      summaryEl.textContent =
        'Виділено 1 елемент. Налаштування тіней будуть застосовані до нього.';
      return;
    }

    summaryEl.textContent =
      'Виділено ' +
      count +
      ' елементи(ів). Тіні будуть застосовані до всіх вибраних елементів.';
  }

  // --- ПРЕСЕТИ ЗОВНІШНЬОЇ ТІНІ --- //
  const presetBtns = Array.from(sectionEl.querySelectorAll('[data-sh-preset]'));

function applyPresetToOuter(presetId) {
  const o = shadowsState.outer;

  if (presetId === 'soft') {
    o.offsetX = 0;
    o.offsetY = 12;
    o.blur = 24;
    o.spread = 0;
    o.opacity = 35;
  } else if (presetId === 'accent') {
    o.offsetX = 0;
    o.offsetY = 14;
    o.blur = 32;
    o.spread = 4;
    o.opacity = 60;
  } else if (presetId === 'outline') {
    o.offsetX = 0;
    o.offsetY = 0;
    o.blur = 0;
    o.spread = 1;
    o.opacity = 70;
  } else if (presetId === 'glow') {
    o.offsetX = 0;
    o.offsetY = 0;
    o.blur = 32;
    o.spread = 8;
    o.opacity = 80;
  }

  o.preset = presetId;

  // 🔹 При виборі пресета ми однозначно редагуємо ЗОВНІШНЮ тінь
  shadowsState.editTarget = 'outer';

  syncInnerControls();          // оновлюємо стан кнопки "Внутрішня тінь" + ярличок
  syncGeometryControlsFromState();
  syncPresetButtons();
  applyShadowsToTargets();
}

  function syncPresetButtons() {
  const isOuterActive = shadowsState.editTarget === 'outer';

  presetBtns.forEach((btn) => {
    const id = btn.getAttribute('data-sh-preset');
    const shouldBeActive = isOuterActive && id === shadowsState.outer.preset;
    btn.classList.toggle('is-active', shouldBeActive);
  });
}

  // --- ЧЕКБОКС "Немає зовнішньої тіні" --- //
  const outerNoneCheckbox = sectionEl.querySelector('[data-shadow-outer-none]');

  function syncOuterNoneCheckbox() {
    if (!outerNoneCheckbox) return;
    outerNoneCheckbox.checked = !!shadowsState.outerDisabled;
  }

  if (outerNoneCheckbox) {
    outerNoneCheckbox.addEventListener('change', () => {
      const disabled = outerNoneCheckbox.checked;
      if (disabled) {
        // Зберегти поточний стан outer, якщо ще не зберегли
        if (!shadowsState.lastOuterSnapshot) {
          shadowsState.lastOuterSnapshot = JSON.parse(
            JSON.stringify(shadowsState.outer)
          );
        }
        shadowsState.outerDisabled = true;
      } else {
        shadowsState.outerDisabled = false;
        // Відновити, якщо було що відновлювати
        if (shadowsState.lastOuterSnapshot) {
          shadowsState.outer = JSON.parse(
            JSON.stringify(shadowsState.lastOuterSnapshot)
          );
        }
      }
      syncGeometryControlsFromState();
      syncColorControlsFromState();
      syncPresetButtons();
      applyShadowsToTargets();
    });
  }

  // --- ВНУТРІШНЯ ТІНЬ: кнопка + чекбокс --- //
  const innerToggleBtn = sectionEl.querySelector('[data-shadow-inner-toggle]');
  const innerNoneCheckbox = sectionEl.querySelector('[data-shadow-inner-none]');

  function syncInnerControls() {
    if (innerToggleBtn) {
      innerToggleBtn.classList.toggle(
        'is-active',
        shadowsState.editTarget === 'inner'
      );
    }
    if (innerNoneCheckbox) {
      innerNoneCheckbox.checked = !shadowsState.inner.enabled;
    }
    if (editTargetLabelEl) {
      editTargetLabelEl.textContent =
        shadowsState.editTarget === 'inner' ? 'внутрішня' : 'зовнішня';
    }
  }

  if (innerToggleBtn) {
  innerToggleBtn.addEventListener('click', () => {
    shadowsState.editTarget =
      shadowsState.editTarget === 'outer' ? 'inner' : 'outer';

    syncInnerControls();
    syncGeometryControlsFromState();
    syncPresetButtons(); // 🔹 оновлюємо підсвітку пресетів
  });
}


  if (innerNoneCheckbox) {
    innerNoneCheckbox.addEventListener('change', () => {
      const noInner = innerNoneCheckbox.checked;
      shadowsState.inner.enabled = !noInner;
      syncInnerControls();
      applyShadowsToTargets();
    });
  }

  // --- ГЕОМЕТРІЯ (спільні повзунки) --- //
  const geomInputs = Array.from(
    sectionEl.querySelectorAll('[data-shadow-geom]')
  );

  function syncGeometryControlsFromState() {
    const target =
      shadowsState.editTarget === 'inner' ? shadowsState.inner : shadowsState.outer;

    geomInputs.forEach((inp) => {
      const key = inp.getAttribute('data-shadow-geom');
      if (!key) return;
      if (typeof target[key] === 'number') {
        inp.value = String(target[key]);
      }
    });

    if (editTargetLabelEl) {
      editTargetLabelEl.textContent =
        shadowsState.editTarget === 'inner' ? 'внутрішня' : 'зовнішня';
    }
  }

  geomInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.getAttribute('data-shadow-geom');
      if (!key) return;

      const num = Number(inp.value) || 0;
      const target =
        shadowsState.editTarget === 'inner' ? shadowsState.inner : shadowsState.outer;

      target[key] = num;
      target.preset = 'custom'; // як тільки рухаємо повзунок — preset = custom

      if (shadowsState.editTarget === 'outer') {
        syncPresetButtons();
      }

      applyShadowsToTargets();
    });
  });

  // --- КОЛЬОРИ та ПРОЗОРІСТЬ --- //
  const colorInputs = Array.from(
    sectionEl.querySelectorAll('[data-shadow-color]')
  );
  const opacityInputs = Array.from(
    sectionEl.querySelectorAll('[data-shadow-opacity]')
  );

  function syncColorControlsFromState() {
    colorInputs.forEach((inp) => {
      const where = inp.getAttribute('data-shadow-color'); // 'outer' | 'inner'
      if (where === 'outer') {
        inp.value = shadowsState.outer.color;
      } else if (where === 'inner') {
        inp.value = shadowsState.inner.color;
      }
    });

    opacityInputs.forEach((inp) => {
      const where = inp.getAttribute('data-shadow-opacity');
      if (where === 'outer') {
        inp.value = String(shadowsState.outer.opacity);
      } else if (where === 'inner') {
        inp.value = String(shadowsState.inner.opacity);
      }
    });
  }

  colorInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const where = inp.getAttribute('data-shadow-color');
      const val = inp.value || '#000000';
      if (where === 'outer') {
        shadowsState.outer.color = val;
      } else if (where === 'inner') {
        shadowsState.inner.color = val;
      }
      applyShadowsToTargets();
    });
  });

  opacityInputs.forEach((inp) => {
    inp.addEventListener('input', () => {
      const where = inp.getAttribute('data-shadow-opacity');
      const num = Number(inp.value) || 0;
      const clamp = Math.max(0, Math.min(100, num));
      if (where === 'outer') {
        shadowsState.outer.opacity = clamp;
      } else if (where === 'inner') {
        shadowsState.inner.opacity = clamp;
      }
      applyShadowsToTargets();
    });
  });

  // --- АКОРДЕОНИ ПІД-РОЗДІЛІВ --- //
  const subsections = Array.from(
    sectionEl.querySelectorAll('.design-border-subsection')
  );
  let subState = loadShadowsSubsectionsState();
  const hasStored = subState && Object.keys(subState).length > 0;

  subsections.forEach((sub, index) => {
    const existingId = sub.getAttribute('data-shadows-subsection-id');
    const id = existingId || 'sh-' + (index + 1);
    sub.setAttribute('data-shadows-subsection-id', id);

    let isOpen;
    if (hasStored && Object.prototype.hasOwnProperty.call(subState, id)) {
      isOpen = !!subState[id];
    } else {
      isOpen = id === 'mode';
    }

    const header = sub.querySelector('.design-border-subheader');
    const body = sub.querySelector('.design-border-subbody');
    const chevron = sub.querySelector('.design-border-subheader-chevron');

    function applyOpenState(open) {
      sub.classList.toggle('is-open', open);
      if (body) body.hidden = !open;
      if (chevron) chevron.textContent = open ? '▼' : '▶';
    }

    applyOpenState(isOpen);

    if (header && !header.dataset.shadowsSubBound) {
      header.dataset.shadowsSubBound = '1';
      header.addEventListener('click', () => {
        const currentlyOpen = sub.classList.contains('is-open');
        const nextState = !currentlyOpen;
        applyOpenState(nextState);

        subState = subState || {};
        subState[id] = nextState;
        saveShadowsSubsectionsState(subState);
      });
    }
  });

  // --- ЗАСТОСУВАННЯ ТІНЕЙ ДО ТАРГЕТІВ --- //
  function applyShadowsToTargets() {
    const targets = getShadowTargets();
    if (!targets.length) {
      shLog('applyShadowsToTargets: немає таргетів');
      return;
    }

    const o = shadowsState.outer;
    const i = shadowsState.inner;

    const hasOuter = o.enabled && !shadowsState.outerDisabled;
    const hasInner = i.enabled;

    const outerOpacity01 = Math.max(0, Math.min(100, o.opacity)) / 100;
    const innerOpacity01 = Math.max(0, Math.min(100, i.opacity)) / 100;

    const parts = [];

    if (hasOuter) {
      const outerColor = hexToRgba(o.color, outerOpacity01);
      parts.push(
        `${o.offsetX}px ${o.offsetY}px ${o.blur}px ${o.spread}px ${outerColor}`
      );
    }

    if (hasInner) {
      const innerColor = hexToRgba(i.color, innerOpacity01);
      parts.push(
        `inset ${i.offsetX}px ${i.offsetY}px ${i.blur}px ${i.spread}px ${innerColor}`
      );
    }

    const boxShadowValue = parts.join(', ');

    targets.forEach((el, idx) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.boxShadow = boxShadowValue;
      shLog('applyShadowsToTargets →', idx, el, 'box-shadow =', boxShadowValue);
    });
  }

  // --- Кнопка "Застосувати" --- //
  const applyBtn = sectionEl.querySelector('button[data-shadows="apply"]');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      shLog('Клік по "Застосувати тіні"');
      applyShadowsToTargets();
    });
  }

  // Вставити секцію в панель
  host.appendChild(sectionEl);

  // Початковий sync UI
  syncPresetButtons();
  syncOuterNoneCheckbox();
  syncInnerControls();
  syncGeometryControlsFromState();
  syncColorControlsFromState();
  updateTargetsSummary();

  // --- Спостерігаємо за зміною класів виділення --- //
  const siteRoot = document.getElementById('site-root');
  if (siteRoot) {
    const mo = new MutationObserver((mutations) => {
      let need = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const t = m.target;
          if (
            t instanceof HTMLElement &&
            (t.classList.contains('is-active') ||
              t.classList.contains('is-selected'))
          ) {
            need = true;
            break;
          }
        }
      }
      if (need) {
        setTimeout(() => {
          updateTargetsSummary();
        }, 0);
      }
    });

    mo.observe(siteRoot, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
      childList: true
    });
  }
}
