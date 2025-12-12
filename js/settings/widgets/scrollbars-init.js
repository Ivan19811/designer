// js/settings/widgets/scrollbars-init.js
// Віджет налаштування скролбарів для конструктора ShiftTime
// Працює окремо від інших модулів, нічого не ламає.

(() => {
  const LOG_PREFIX = '[scrollbars]';

// В продакшені логи не потрібні
const log = () => {};


  const ready = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      // Документ уже готовий
      log('document already ready');
      fn();
    }
  };

  const STORAGE_KEY = 'stScrollbarsSettings_v1';

  const DEFAULT_STATE = {
    main: {
      mode: 'always',        // always | hover | hidden
      width: 8,              // px
      radius: 999,           // px
      track: '#020617',
      thumb: '#38bdf8',
      thumbHover: '#7ed4fa'
    },
    side: {
      mode: 'always',
      width: 8,
      radius: 999,
      track: '#020617',
      thumb: '#38bdf8',
      thumbHover: '#7ed4fa'
    }
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return {
        main: { ...DEFAULT_STATE.main, ...(parsed.main || {}) },
        side: { ...DEFAULT_STATE.side, ...(parsed.side || {}) }
      };
    } catch (e) {
      console.warn(LOG_PREFIX, 'loadState error', e);
      return { ...DEFAULT_STATE };
    }
  };

  const saveState = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn(LOG_PREFIX, 'saveState error', e);
    }
  };

  // Створюємо HTML однієї групи
  function groupMarkup(key, title, note) {
    return `
      <section class="builder__field-group" data-sb-group="${key}">
        <div class="builder__field-group-header">
          <div>
            <div class="builder__field-group-label">${title}</div>
            ${note ? `<p class="builder__field-group-note">${note}</p>` : ''}
          </div>
        </div>
        <div class="builder__field-group-body">
          <div class="builder__field">
            <label class="builder__field-label">Режим відображення</label>
            <select class="builder__select" data-sb-field="mode">
              <option value="always">Показувати завжди</option>
              <option value="hover">Показувати при наведенні</option>
              <option value="hidden">Приховати</option>
            </select>
          </div>

          <div class="builder__field">
            <label class="builder__field-label">
              Ширина повзунка, px
              <span class="builder__field-label-help">(0–24)</span>
            </label>
            <div class="builder__field-row">
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                class="builder__range"
                data-sb-field="width"
              />
              <input
                type="number"
                min="0"
                max="24"
                step="1"
                class="builder__number"
                data-sb-field="widthNumber"
              />
            </div>
          </div>

          <div class="builder__field">
            <label class="builder__field-label">
              Радіус повзунка, px
              <span class="builder__field-label-help">(0–999)</span>
            </label>
            <div class="builder__field-row">
              <input
                type="range"
                min="0"
                max="999"
                step="1"
                class="builder__range"
                data-sb-field="radius"
              />
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                class="builder__number"
                data-sb-field="radiusNumber"
              />
            </div>
          </div>

          <div class="builder__field">
            <label class="builder__field-label">Колір фону треку</label>
            <input
              type="color"
              class="builder__color"
              data-sb-field="track"
            />
          </div>

          <div class="builder__field">
            <label class="builder__field-label">Колір повзунка</label>
            <input
              type="color"
              class="builder__color"
              data-sb-field="thumb"
            />
          </div>

          <div class="builder__field">
            <label class="builder__field-label">Ховер-колір повзунка</label>
            <input
              type="color"
              class="builder__color"
              data-sb-field="thumbHover"
            />
          </div>
        </div>
      </section>
    `;
  }

  const clamp = (value, min, max) => {
    const n = Number(value);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  function buildCssFor(selector, groupState) {
    const mode = groupState.mode || 'always';
    const width = Number(groupState.width) || 0;
    const radius = Number(groupState.radius) || 0;
    const track = groupState.track || '#020617';
    const thumb = groupState.thumb || '#38bdf8';
    const thumbHover = groupState.thumbHover || '#7ed4fa';

    let scrollbarWidth = 'thin'; // для Firefox
    let baseSize = width;
    let hoverSize = width;

    if (mode === 'hidden') {
      scrollbarWidth = 'none';
      baseSize = 0;
      hoverSize = 0;
    } else if (mode === 'hover') {
      // Базово майже ховаємо, показуємо тільки при :hover
      scrollbarWidth = 'thin';
      baseSize = 0;
      hoverSize = width;
    }

    return `
${selector} {
  scrollbar-color: ${thumb} ${track} !important;
  scrollbar-width: ${scrollbarWidth} !important;
  overscroll-behavior: contain !important;
}

/* WebKit / Chromium */
${selector}::-webkit-scrollbar {
  width: ${baseSize}px !important;
  height: ${baseSize}px !important;
}

${selector}:hover::-webkit-scrollbar {
  width: ${hoverSize}px !important;
  height: ${hoverSize}px !important;
}

${selector}::-webkit-scrollbar-track {
  background: ${track} !important;
}

${selector}::-webkit-scrollbar-thumb {
  background: ${thumb} !important;
  border-radius: ${radius}px !important;
}

${selector}::-webkit-scrollbar-thumb:hover {
  background: ${thumbHover} !important;
}
`;
  }

  ready(() => {
    log('initScrollbarsWidget() старт');

    const globalPanel = document.querySelector('[data-panel-id="global"]');
    if (!globalPanel) {
      log('global panel NOT FOUND, вихід');
      return;
    }

    if (!globalPanel.id) {
      globalPanel.id = 'settings-panel-root';
    }

    const root = globalPanel;
    log('settings root FOUND:', root);

    // Стиль для скролів
    let styleEl = document.getElementById('scrollbars-widget-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'scrollbars-widget-style';
      document.head.appendChild(styleEl);
      log('create <style> scrollbars-widget-style');
    } else {
      log('reuse <style> scrollbars-widget-style');
    }

    // Якщо ще не було нашого віджета — малюємо
    if (!root.querySelector('[data-role="scrollbarsWidget"]')) {
      root.innerHTML = `
        <h2 class="builder__panel-title">Глобальні налаштування</h2>
        <p class="builder__panel-note">
          Керуйте виглядом вертикальної прокрутки для полотна конструктора та додаткового сайтбару.
        </p>

        <div class="sb-scroll-widget" data-role="scrollbarsWidget">
          ${groupMarkup('main', 'Прокрутка конструктора', 'Полотно з макетом сайту')}
          ${groupMarkup('side', 'Прокрутка додаткового сайтбара', 'Правий сайтбар з налаштуваннями')}
        </div>
      `;
    }

    const widgetRoot = root.querySelector('[data-role="scrollbarsWidget"]');
    if (!widgetRoot) {
      log('widgetRoot NOT FOUND, вихід');
      return;
    }

    const state = loadState();
    log('state from localStorage:', state);

    // Допоміжна функція — віддати DOM елементи полів по ключу групи
    const getGroupEls = (key) => {
      const group = widgetRoot.querySelector(`[data-sb-group="${key}"]`);
      if (!group) return null;

      return {
        group,
        mode: group.querySelector('[data-sb-field="mode"]'),
        width: group.querySelector('[data-sb-field="width"]'),
        widthNumber: group.querySelector('[data-sb-field="widthNumber"]'),
        radius: group.querySelector('[data-sb-field="radius"]'),
        radiusNumber: group.querySelector('[data-sb-field="radiusNumber"]'),
        track: group.querySelector('[data-sb-field="track"]'),
        thumb: group.querySelector('[data-sb-field="thumb"]'),
        thumbHover: group.querySelector('[data-sb-field="thumbHover"]')
      };
    };

    const groupsEls = {
      main: getGroupEls('main'),
      side: getGroupEls('side')
    };

    // Ініціалізація значень у UI
    const syncStateToUI = () => {
      ['main', 'side'].forEach((key) => {
        const els = groupsEls[key];
        if (!els) return;
        const s = state[key];

        if (els.mode) els.mode.value = s.mode;
        if (els.width) els.width.value = clamp(s.width, 0, 24);
        if (els.widthNumber) els.widthNumber.value = clamp(s.width, 0, 24);

        if (els.radius) els.radius.value = clamp(s.radius, 0, 999);
        if (els.radiusNumber) els.radiusNumber.value = clamp(s.radius, 0, 999);

        if (els.track) els.track.value = s.track;
        if (els.thumb) els.thumb.value = s.thumb;
        if (els.thumbHover) els.thumbHover.value = s.thumbHover;
      });
    };

    const readGroupFromUI = (key) => {
      const els = groupsEls[key];
      if (!els) return state[key];

      const prev = state[key];

      const mode = els.mode ? els.mode.value : prev.mode;

      const widthVal = els.width ? els.width.value : prev.width;
      const width = clamp(widthVal, 0, 24);

      const radiusVal = els.radius ? els.radius.value : prev.radius;
      const radius = clamp(radiusVal, 0, 999);

      const track = els.track ? (els.track.value || prev.track) : prev.track;
      const thumb = els.thumb ? (els.thumb.value || prev.thumb) : prev.thumb;
      const thumbHover = els.thumbHover ? (els.thumbHover.value || prev.thumbHover) : prev.thumbHover;

      const next = { mode, width, radius, track, thumb, thumbHover };
      state[key] = next;
      return next;
    };

    const applyCSS = () => {
      const mainState = readGroupFromUI('main');
      const sideState = readGroupFromUI('side');

      const css = [
        buildCssFor('.canvas__scroll', mainState),
        buildCssFor('.builder__settings-panels', sideState)
      ].join('\n\n');

      styleEl.textContent = css;
      saveState(state);
      log('applyCSS()', css);
    };

    syncStateToUI();
    applyCSS();

    // Обробники змін
    const onInput = (evt) => {
      const target = evt.target;
      if (!target) return;
      const groupEl = target.closest('[data-sb-group]');
      if (!groupEl) return;

      const key = groupEl.getAttribute('data-sb-group');
      if (!key || !state[key]) return;

      const els = groupsEls[key];

      if (target === els.width && els.widthNumber) {
        els.widthNumber.value = clamp(target.value, 0, 24);
      } else if (target === els.widthNumber && els.width) {
        const v = clamp(target.value, 0, 24);
        els.width.value = v;
        els.widthNumber.value = v;
      }

      if (target === els.radius && els.radiusNumber) {
        els.radiusNumber.value = clamp(target.value, 0, 999);
      } else if (target === els.radiusNumber && els.radius) {
        const v = clamp(target.value, 0, 999);
        els.radius.value = v;
        els.radiusNumber.value = v;
      }

      applyCSS();
    };

    widgetRoot.addEventListener('input', onInput);
    widgetRoot.addEventListener('change', onInput);

    log('scrollbars widget готовий');
  });
})();
