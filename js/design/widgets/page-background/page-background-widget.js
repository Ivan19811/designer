// js/design/widgets/page-background/page-background-widget.js
// Віджет "Фон сторінки" для панелі "Дизайн" (правий сайтбар).

import { siteState } from '../../../site-state.js';

export function initPageBackgroundWidget(host) {
  if (!host) return;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section is-open';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Фон сторінки</span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>
    <div class="design-section__body">
      <div class="design-field">
        <div class="design-label">Режим заливки</div>
        <div class="design-bg-modes">
          <label class="design-bg-mode">
            <input type="radio" name="bgMode" value="color" checked>
            <span>Колір</span>
          </label>
          <label class="design-bg-mode">
            <input type="radio" name="bgMode" value="gradient">
            <span>Градієнт</span>
          </label>
          <label class="design-bg-mode">
            <input type="radio" name="bgMode" value="image">
            <span>Зображення</span>
          </label>
        </div>
      </div>

      <!-- Режим: КОЛІР -->
      <div class="design-bg-group" data-bg-group="color">
        <div class="design-bg-row">
          <label>Колір</label>
          <input type="color" data-bg="color" value="#111827">
          <input type="text" class="design-input" data-bg="colorText" value="#111827" placeholder="#111827">
        </div>
      </div>

      <!-- Режим: ГРАДІЄНТ -->
      <div class="design-bg-group" data-bg-group="gradient">
        <div class="design-bg-row">
          <label>1-й колір</label>
          <input type="color" data-bg="gradColor1" value="#111827">
          <input type="text" class="design-input" data-bg="gradColor1Text" value="#111827">
        </div>
        <div class="design-bg-row">
          <label>2-й колір</label>
          <input type="color" data-bg="gradColor2" value="#020617">
          <input type="text" class="design-input" data-bg="gradColor2Text" value="#020617">
        </div>
        <div class="design-bg-row">
          <label>Напрямок</label>
          <select class="design-select" data-bg="gradDirection">
            <option value="to bottom">Зверху вниз</option>
            <option value="to top">Знизу вверх</option>
            <option value="to right">Зліва направо</option>
            <option value="to left">Справа наліво</option>
            <option value="135deg">Діагональ ↘</option>
            <option value="225deg">Діагональ ↙</option>
          </select>
        </div>
      </div>

      <!-- Режим: ЗОБРАЖЕННЯ -->
      <div class="design-bg-group" data-bg-group="image">
        <div class="design-bg-row">
          <label>URL зображення</label>
          <input type="text" class="design-input" data-bg="imageUrl" placeholder="https://...">
        </div>
        <div class="design-bg-row">
          <label>Розмір</label>
          <select class="design-select" data-bg="imageSize">
            <option value="cover" selected>Cover (на весь екран)</option>
            <option value="contain">Contain</option>
            <option value="auto">Оригінал</option>
          </select>
        </div>
        <div class="design-bg-row">
          <label>Позиція</label>
          <select class="design-select" data-bg="imagePosition">
            <option value="center center" selected>По центру</option>
            <option value="top center">Зверху</option>
            <option value="bottom center">Знизу</option>
            <option value="center left">Зліва</option>
            <option value="center right">Справа</option>
          </select>
        </div>
      </div>

      <!-- Оверлеї / чорно-біле -->
      <div class="design-bg-group">
        <div class="design-label">Оверлеї / чорно-біле</div>
        <div class="design-bg-flags">
          <label class="design-bg-flag">
            <input type="checkbox" data-bg="overlayTop">
            <span>Верхнє затемнення</span>
          </label>
          <label class="design-bg-flag">
            <input type="checkbox" data-bg="overlayBottom">
            <span>Нижнє затемнення</span>
          </label>
        </div>
        <div class="design-subnote">
          Використовується існуючий оверлей .overlay-top / .overlay-bottom над полотном сайту.
        </div>
      </div>
    </div>
  `;

  const headerBtn = sectionEl.querySelector('.design-section__header');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      sectionEl.classList.toggle('is-open');
    });
  }

  host.appendChild(sectionEl);

  const siteCanvas = document.getElementById('site-canvas');
  const modeRadios = Array.from(sectionEl.querySelectorAll('input[name="bgMode"]'));
  const groups = Array.from(sectionEl.querySelectorAll('.design-bg-group'));

  function getStateFromUI() {
    const modeRadio = modeRadios.find(r => r.checked);
    const mode = modeRadio ? modeRadio.value : 'color';

    const getVal = name => {
      const el = sectionEl.querySelector(`[data-bg="${name}"]`);
      return el ? el.value : '';
    };

    const getChecked = name => {
      const el = sectionEl.querySelector(`[data-bg="${name}"]`);
      return !!(el && el.checked);
    };

    let color = getVal('color') || getVal('colorText') || '#111827';
    let gradColor1 = getVal('gradColor1') || getVal('gradColor1Text') || '#111827';
    let gradColor2 = getVal('gradColor2') || getVal('gradColor2Text') || '#020617';

    // нормалізуємо, якщо користувач вводить без "#"
    const norm = c => {
      const v = c.trim();
      if (!v) return '';
      return v.startsWith('#') ? v : '#' + v;
    };

    color = norm(color);
    gradColor1 = norm(gradColor1);
    gradColor2 = norm(gradColor2);

    return {
      mode,
      color,
      gradColor1,
      gradColor2,
      gradDirection: getVal('gradDirection') || 'to bottom',
      imageUrl: getVal('imageUrl'),
      imageSize: getVal('imageSize') || 'cover',
      imagePosition: getVal('imagePosition') || 'center center',
      overlayTop: getChecked('overlayTop'),
      overlayBottom: getChecked('overlayBottom')
    };
  }

  function applyToUI(state) {
    if (!state) return;

    modeRadios.forEach(radio => {
      radio.checked = radio.value === state.mode;
      const label = radio.closest('.design-bg-mode');
      if (label) {
        label.classList.toggle('is-active', radio.checked);
      }
    });

    const setVal = (name, value) => {
      const el = sectionEl.querySelector(`[data-bg="${name}"]`);
      if (el && value != null) {
        el.value = value;
      }
    };

    setVal('color', state.color);
    setVal('colorText', state.color);
    setVal('gradColor1', state.gradColor1);
    setVal('gradColor1Text', state.gradColor1);
    setVal('gradColor2', state.gradColor2);
    setVal('gradColor2Text', state.gradColor2);
    setVal('gradDirection', state.gradDirection);
    setVal('imageUrl', state.imageUrl);
    setVal('imageSize', state.imageSize);
    setVal('imagePosition', state.imagePosition);

    const setChecked = (name, value) => {
      const el = sectionEl.querySelector(`[data-bg="${name}"]`);
      if (el) el.checked = !!value;
    };
    setChecked('overlayTop', state.overlayTop);
    setChecked('overlayBottom', state.overlayBottom);

    updateGroupsVisibility(state.mode);
  }

  function updateGroupsVisibility(mode) {
    groups.forEach(group => {
      const gMode = group.getAttribute('data-bg-group');
      if (!gMode) return;
      group.style.display = gMode === mode ? 'flex' : 'none';
    });
  }

  function applyToCanvas(state) {
    if (!siteCanvas || !state) return;

    siteCanvas.style.backgroundImage = '';
    siteCanvas.style.backgroundColor = '';
    siteCanvas.style.backgroundSize = '';
    siteCanvas.style.backgroundPosition = '';
    siteCanvas.style.backgroundRepeat = '';

    if (state.mode === 'color') {
      siteCanvas.style.backgroundColor = state.color || '#111827';
    } else if (state.mode === 'gradient') {
      const c1 = state.gradColor1 || '#111827';
      const c2 = state.gradColor2 || '#020617';
      const dir = state.gradDirection || 'to bottom';
      siteCanvas.style.backgroundImage = `linear-gradient(${dir}, ${c1}, ${c2})`;
      siteCanvas.style.backgroundColor = 'transparent';
    } else if (state.mode === 'image') {
      if (state.imageUrl) {
        siteCanvas.style.backgroundImage = `url("${state.imageUrl}")`;
        siteCanvas.style.backgroundSize = state.imageSize || 'cover';
        siteCanvas.style.backgroundPosition = state.imagePosition || 'center center';
        siteCanvas.style.backgroundRepeat = 'no-repeat';
        // Трохи затемнюємо фон за замовчуванням
        siteCanvas.style.backgroundColor = 'rgba(15,23,42,0.85)';
      } else {
        siteCanvas.style.backgroundColor = '#111827';
      }
    }

    siteCanvas.classList.toggle('overlay-top', !!state.overlayTop);
    siteCanvas.classList.toggle('overlay-bottom', !!state.overlayBottom);

    // зберігаємо в поточному стані сторінки
    if (siteState && siteState.page) {
      siteState.page.background = { ...state };
    }
  }

  function handleChange() {
    const state = getStateFromUI();
    applyToCanvas(state);
  }

  // Підписуємось на зміни
  sectionEl.addEventListener('change', e => {
    const target = e.target;
    if (target && target.name === 'bgMode') {
      const mode = target.value;
      modeRadios.forEach(radio => {
        const label = radio.closest('.design-bg-mode');
        if (label) {
          label.classList.toggle('is-active', radio === target);
        }
      });
      updateGroupsVisibility(mode);
    }
    handleChange();
  });

  sectionEl.addEventListener('input', () => {
    handleChange();
  });

  // Стартове значення — або зі state, або дефолт
  const initialState =
    (siteState && siteState.page && siteState.page.background) || {
      mode: 'color',
      color: '#111827',
      gradColor1: '#111827',
      gradColor2: '#020617',
      gradDirection: 'to bottom',
      imageUrl: '',
      imageSize: 'cover',
      imagePosition: 'center center',
      overlayTop: false,
      overlayBottom: false
    };

  applyToUI(initialState);
  applyToCanvas(initialState);
}
