// js/panel-constructor.js
// Налаштування конструктора (реальний час + збереження тем).

const LS_CUSTOM = 'builder_constructor_custom';
const LS_THEMES = 'builder_constructor_saved_themes';

export function initConstructorPanel() {
  const root = document.getElementById('builder-root');
  const host = document.getElementById('constructor-panel-root');
  const savedSelect = document.getElementById('builder-saved-theme-select');
  if (!root || !host) return;

  // 1) Рендер панелі (акордеон, як у "Дизайн")
  host.innerHTML = `
    <h2 class="builder__panel-title">Налаштування конструктора</h2>

    <div class="design-panel" id="constructor-design-panel">
      <!-- Кольори / базовий стиль -->
      <section class="design-section">
        <button class="design-section__header" type="button">
          <div class="design-section__header-title">
            <span>Кольори та фон</span>
          </div>
          <span class="design-section__chevron">▶</span>
        </button>
        <div class="design-section__body">
          <div class="builder__field-group">
            <label class="builder__field">
              <span class="builder__field-label">Акцентний колір</span>
              <input type="color" id="c-accent" />
            </label>

            <label class="builder__field">
              <span class="builder__field-label">Колір тексту</span>
              <input type="color" id="c-text" />
            </label>

            <label class="builder__field">
              <span class="builder__field-label">Фон конструктора</span>
              <input type="color" id="c-body" />
            </label>

            <label class="builder__field">
              <span class="builder__field-label">Фон панелей</span>
              <input type="color" id="c-surface" />
            </label>
          </div>
        </div>
      </section>

      <!-- Радіуси / тіні -->
      <section class="design-section">
        <button class="design-section__header" type="button">
          <div class="design-section__header-title">
            <span>Радіуси та тіні</span>
          </div>
          <span class="design-section__chevron">▶</span>
        </button>
        <div class="design-section__body">
          <div class="builder__field-group">
            <label class="builder__field">
              <span class="builder__field-label">Радіус кутів (0–24px)</span>
              <input type="range" id="c-radius" min="0" max="24" step="1" />
            </label>

            <label class="builder__checkbox">
              <input type="checkbox" id="c-shadow" />
              <span>Тіні ввімкнені</span>
            </label>
          </div>
        </div>
      </section>

      <!-- Збережені теми -->
      <section class="design-section">
        <button class="design-section__header" type="button">
          <div class="design-section__header-title">
            <span>Теми конструктора</span>
          </div>
          <span class="design-section__chevron">▶</span>
        </button>
        <div class="design-section__body">
          <div class="builder__field-group">
            <label class="builder__field">
              <span class="builder__field-label">Назва теми</span>
              <input type="text" id="c-theme-name" placeholder="Напр. Моя тема 1" />
            </label>

            <button id="c-save-theme" class="builder__primary-btn">Зберегти тему</button>
          </div>
        </div>
      </section>
    </div>
  `;

  const els = {
    accent: host.querySelector('#c-accent'),
    text: host.querySelector('#c-text'),
    body: host.querySelector('#c-body'),
    surface: host.querySelector('#c-surface'),
    radius: host.querySelector('#c-radius'),
    shadow: host.querySelector('#c-shadow'),
    name: host.querySelector('#c-theme-name'),
    save: host.querySelector('#c-save-theme'),
  };

  initConstructorAccordion(host);

  // 2) Завантажити custom налаштування
  const custom = loadCustom() || defaultCustom();
  applyCustom(root, custom);
  setInputs(els, custom);

  // 3) Реальний час
  els.accent.addEventListener('input', () => update());
  els.text.addEventListener('input', () => update());
  els.body.addEventListener('input', () => update());
  els.surface.addEventListener('input', () => update());
  els.radius.addEventListener('input', () => update());
  els.shadow.addEventListener('change', () => update());

  function update() {
    const data = readInputs(els);
    applyCustom(root, data);
    saveCustom(data);
  }

  // 4) Збереження теми
  if (els.save) {
    els.save.addEventListener('click', () => {
      const name = (els.name.value || '').trim();
      if (!name) {
        alert('Вкажи назву теми');
        return;
      }
      const data = readInputs(els);
      const all = loadThemes();
      all[name] = data;
      saveThemes(all);
      if (savedSelect) {
        fillSavedThemes(savedSelect, all);
        savedSelect.value = name;
      }
    });
  }

  // 5) Якщо є select з темами — підвантажити
  if (savedSelect) {
    const all = loadThemes();
    fillSavedThemes(savedSelect, all);
    savedSelect.addEventListener('change', () => {
      const key = savedSelect.value;
      if (!key) return;
      const all2 = loadThemes();
      const data = all2[key];
      if (!data) return;
      setInputs(els, data);
      applyCustom(root, data);
      saveCustom(data);
    });
  }
}

function defaultCustom() {
  return {
    accent: '#38bdf8',
    text: '#e5e7eb',
    body: '#0f172a',
    surface: '#111827',
    radius: 18,
    shadow: true,
  };
}

function readInputs(els) {
  return {
    accent: els.accent.value,
    text: els.text.value,
    body: els.body.value,
    surface: els.surface.value,
    radius: Number(els.radius.value),
    shadow: !!els.shadow.checked,
  };
}

function setInputs(els, data) {
  els.accent.value = data.accent;
  els.text.value = data.text;
  els.body.value = data.body;
  els.surface.value = data.surface;
  els.radius.value = data.radius;
  els.shadow.checked = data.shadow;
}

function applyCustom(root, data) {
  root.style.setProperty('--clr-accent', data.accent);
  root.style.setProperty('--clr-text-main', data.text);
  root.style.setProperty('--clr-bg-body', data.body);
  root.style.setProperty('--clr-bg-surface', data.surface);

  root.style.setProperty('--builder-radius-lg', `${data.radius}px`);
  root.style.setProperty('--builder-radius-md', `${Math.max(0, data.radius - 6)}px`);

  if (!data.shadow) {
    root.style.setProperty('--builder-shadow-soft', 'none');
  } else {
    root.style.setProperty(
      '--builder-shadow-soft',
      '0 18px 45px rgba(15, 23, 42, 0.85)'
    );
  }
}

function saveCustom(data) {
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(data));
  } catch (e) {
    console.warn('[constructor-panel] Не вдалося зберегти custom тему', e);
  }
}
function loadCustom() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[constructor-panel] Не вдалося прочитати custom тему', e);
    return null;
  }
}

function saveThemes(obj) {
  try {
    localStorage.setItem(LS_THEMES, JSON.stringify(obj));
  } catch (e) {
    console.warn('[constructor-panel] Не вдалося зберегти теми', e);
  }
}
function loadThemes() {
  try { return JSON.parse(localStorage.getItem(LS_THEMES) || '{}'); }
  catch { return {}; }
}

function fillSavedThemes(select, themes) {
  if (!select) return;
  const keys = Object.keys(themes);

  select.innerHTML = `<option value="">— вибери —</option>` +
    keys.map(k => `<option value="${k}">${k}</option>`).join('');
}

// Проста логіка акордеону для панелі "Налаштування конструктора"
function initConstructorAccordion(host) {
  if (!host) return;

  const sections = Array.from(host.querySelectorAll('.design-section'));
  if (!sections.length) return;

  // За замовчуванням усі секції закриті
  sections.forEach(sec => {
    sec.classList.remove('is-open');
    const header = sec.querySelector('.design-section__header');
    if (header && !header.dataset.constructorAccordionBound) {
      header.dataset.constructorAccordionBound = '1';
      header.addEventListener('click', () => {
        sec.classList.toggle('is-open');
      });
    }
  });
}
