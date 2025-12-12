// js/design/widgets/fill/fill-widget.js
// Віджет "Заливка" — фон / градієнт / картинка для блоків, секцій і текстових контейнерів.

export function initFillWidget(host, getSelection) {
  if (!host) return;

  // 🔥 Внутрішній мультивибір (Ctrl+клік по canvas)
  let manualTargets = [];

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Заливка</span>
        <span class="design-section__header-subtitle">
          
        </span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>

    <div class="design-section__body">
      <div class="design-field">
        <div class="design-field__label">Режим заливки</div>
        <div class="design-fill-modes" data-fill-modes>
          <button type="button" class="design-pill is-active" data-fill-mode="color">Колір</button>
          <button type="button" class="design-pill" data-fill-mode="gradient">Градієнт</button>
          <button type="button" class="design-pill" data-fill-mode="image">Картинка</button>
        </div>
      </div>

      <!-- КОЛІР -->
      <div class="design-field" data-fill-group="color">
        <div class="design-field__label">Суцільний колір</div>
        <div class="design-fill-row">
          <input type="color" data-fill="color" value="#0f172a" />
          <input type="text" class="design-input" data-fill="colorText" value="#0f172a" placeholder="#0f172a" />
        </div>
      </div>

      <!-- ГРАДІЄНТ -->
      <div class="design-field" data-fill-group="gradient" hidden>
        <div class="design-field__label">Градієнт</div>
        <div class="design-fill-row">
          <label class="design-fill-label">1-й колір</label>
          <input type="color" data-fill="gradColor1" value="#0f172a" />
          <input type="text" class="design-input" data-fill="gradColor1Text" value="#0f172a" />
        </div>
        <div class="design-fill-row">
          <label class="design-fill-label">2-й колір</label>
          <input type="color" data-fill="gradColor2" value="#1e293b" />
          <input type="text" class="design-input" data-fill="gradColor2Text" value="#1e293b" />
        </div>
        <div class="design-fill-row">
          <label class="design-fill-label">Напрямок</label>
          <select class="design-select" data-fill="gradDirection">
            <option value="to bottom">Зверху вниз</option>
            <option value="to top">Знизу вверх</option>
            <option value="to right">Зліва направо</option>
            <option value="to left">Справа наліво</option>
            <option value="135deg">Діагональ ↘</option>
            <option value="225deg">Діагональ ↙</option>
          </select>
        </div>
      </div>

      <!-- КАРТИНКА -->
      <div class="design-field" data-fill-group="image" hidden>
        <div class="design-field__label">Фонова картинка</div>
        <div class="design-fill-row">
          <input type="text" class="design-input" data-fill="imageUrl" placeholder="https://..." />
        </div>
        <div class="design-fill-row">
          <label class="design-fill-label">Розмір</label>
          <select class="design-select" data-fill="imageSize">
            <option value="cover" selected>Cover (на весь блок)</option>
            <option value="contain">Contain</option>
            <option value="auto">Оригінал</option>
          </select>
        </div>
        <div class="design-fill-row">
          <label class="design-fill-label">Позиція</label>
          <select class="design-select" data-fill="imagePosition">
            <option value="center center" selected>По центру</option>
            <option value="top center">Зверху</option>
            <option value="bottom center">Знизу</option>
            <option value="center left">Зліва</option>
            <option value="center right">Справа</option>
          </select>
        </div>
      </div>

      <!-- Прозорість + чорно-білий -->
      <div class="design-field">
        <div class="design-field__label">Додатково</div>
        <div class="design-field__row design-fill-extra">
          <div class="design-fill-extra-group">
            <span class="design-fill-extra-label">Прозорість фону</span>
            <div class="design-fill-extra-controls">
              <input type="range" min="0" max="100" step="1" value="100" class="design-slider" data-fill="opacityRange" />
              <input type="number" min="0" max="100" step="1" value="100" class="design-number" data-fill="opacityNumber" />
            </div>
          </div>
          <div class="design-fill-extra-group">
            <label class="design-fill-flag">
              <input type="checkbox" data-fill="grayscale" />
              <span>Чорно-білий</span>
            </label>
          </div>
        </div>
        <div class="design-subnote">
          Прозорість змінює тільки фон вибраних елементів, а не їхній вміст.
        </div>
      </div>

      <div class="design-field">
        <div class="design-field__row design-fill-apply-row">
          <button type="button" class="design-button" data-fill="apply">
            Застосувати до вибраних
          </button>
          <span class="design-fill-target" data-fill="targetSummary">Немає вибраних елементів</span>
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

  // ---------- helpers ----------
  function normalizeHex(hex) {
    if (!hex) return '#000000';
    let h = String(hex).trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    if (h.length !== 6) return '#000000';
    return '#' + h.toLowerCase();
  }

  function hexToRgba(hex, alpha) {
    const a = typeof alpha === 'number' ? Math.max(0, Math.min(1, alpha)) : 1;
    const norm = normalizeHex(hex).slice(1);
    const r = parseInt(norm.slice(0, 2), 16) || 0;
    const g = parseInt(norm.slice(2, 4), 16) || 0;
    const b = parseInt(norm.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function rgbaToHexAlpha(str) {
    if (!str) return { hex: '#000000', alpha: 1 };
    const m = str.replace(/\s+/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,(\d*\.?\d+))?\)$/i);
    if (!m) return { hex: '#000000', alpha: 1 };
    const r = parseInt(m[1], 10) || 0;
    const g = parseInt(m[2], 10) || 0;
    const b = parseInt(m[3], 10) || 0;
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return {
      hex: '#' + toHex(r) + toHex(g) + toHex(b),
      alpha: Math.max(0, Math.min(1, isNaN(a) ? 1 : a))
    };
  }

  // ---------- UI refs ----------
  const modeButtons   = Array.from(sectionEl.querySelectorAll('[data-fill-mode]'));
  const groups        = Array.from(sectionEl.querySelectorAll('[data-fill-group]'));
  const modeContainer = sectionEl.querySelector('[data-fill-modes]');
  const targetSummary = sectionEl.querySelector('[data-fill="targetSummary"]');
  const applyBtn      = sectionEl.querySelector('[data-fill="apply"]');

  const opacityRange  = sectionEl.querySelector('[data-fill="opacityRange"]');
  const opacityNumber = sectionEl.querySelector('[data-fill="opacityNumber"]');
  const grayscaleChk  = sectionEl.querySelector('[data-fill="grayscale"]');

  const colorInput    = sectionEl.querySelector('[data-fill="color"]');
  const colorText     = sectionEl.querySelector('[data-fill="colorText"]');
  const grad1Input    = sectionEl.querySelector('[data-fill="gradColor1"]');
  const grad1Text     = sectionEl.querySelector('[data-fill="gradColor1Text"]');
  const grad2Input    = sectionEl.querySelector('[data-fill="gradColor2"]');
  const grad2Text     = sectionEl.querySelector('[data-fill="gradColor2Text"]');
  const gradDirSelect = sectionEl.querySelector('[data-fill="gradDirection"]');
  const imageUrlInput = sectionEl.querySelector('[data-fill="imageUrl"]');
  const imageSizeSelect = sectionEl.querySelector('[data-fill="imageSize"]');
  const imagePosSelect  = sectionEl.querySelector('[data-fill="imagePosition"]');

  // ---------- режими ----------
  function getMode() {
    const active = modeButtons.find(btn => btn.classList.contains('is-active'));
    return active ? active.dataset.fillMode : 'color';
  }

  function setMode(mode) {
    modeButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.fillMode === mode);
    });
    groups.forEach(g => {
      g.hidden = g.getAttribute('data-fill-group') !== mode;
    });
  }

  if (modeContainer) {
    modeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-fill-mode]');
      if (!btn) return;
      const mode = btn.dataset.fillMode;
      if (!mode) return;
      setMode(mode);
      applyFill();
    });
  }

  // ---------- стан з UI ----------
  function getOpacity() {
    let v = Number(opacityRange?.value ?? 100);
    if (!Number.isFinite(v)) v = 100;
    v = Math.max(0, Math.min(100, v));
    return v;
  }

  function getFillStateFromUI() {
    const mode = getMode();
    const pickVal = (name) => {
      const el = sectionEl.querySelector(`[data-fill="${name}"]`);
      return el ? el.value : '';
    };

    const colorRaw = pickVal('color') || pickVal('colorText') || '#0f172a';
    const grad1Raw = pickVal('gradColor1') || pickVal('gradColor1Text') || '#0f172a';
    const grad2Raw = pickVal('gradColor2') || pickVal('gradColor2Text') || '#1e293b';
    const dir      = pickVal('gradDirection') || 'to bottom';
    const imageUrl = pickVal('imageUrl') || '';
    const imageSize = pickVal('imageSize') || 'cover';
    const imagePosition = pickVal('imagePosition') || 'center center';

    const alpha = getOpacity() / 100;
    const grayscale = grayscaleChk && grayscaleChk.checked ? 1 : 0;

    return {
      mode,
      colorRaw: normalizeHex(colorRaw),
      grad1Raw: normalizeHex(grad1Raw),
      grad2Raw: normalizeHex(grad2Raw),
      dir,
      imageUrl,
      imageSize,
      imagePosition,
      alpha,
      grayscale
    };
  }

  // ---------- таргети ----------
  function cleanManualTargets() {
    manualTargets = manualTargets.filter(el => el && el.isConnected);
  }

   function getTargets() {
    const siteRoot = document.getElementById('site-root');

    // 1) Спочатку беремо те, що вже виділене в конструкторі:
    //    - вибір із Дерева сторінки (через panel-page-tree.js)
    //    - клік по полотну (секції / блоки з .is-active або .is-selected)
    if (siteRoot) {
      const selected = siteRoot.querySelectorAll(
        '.st-block.is-selected, .st-section.is-selected'
      );
      if (selected.length) {
        return Array.from(selected);
      }

      const active = siteRoot.querySelectorAll(
        '.st-block.is-active, .st-section.is-active'
      );
      if (active.length) {
        return Array.from(active);
      }
    }

    // 2) Якщо чомусь ще нема — пробуємо getSelection() з panel-design.js
    if (typeof getSelection === 'function') {
      const sel = getSelection();
      if (sel && Array.isArray(sel.elements) && sel.elements.length) {
        return sel.elements;
      }
    }

    // 3) Останній фолбек — наш внутрішній Ctrl+клік (manualTargets)
    manualTargets = (manualTargets || []).filter(el => el && el.isConnected);
    if (manualTargets.length) {
      return manualTargets.slice();
    }

    return [];
  }


  function updateTargetSummary(targets) {
    if (!targetSummary) return;
    const count = targets.length;
    if (!count) {
      targetSummary.textContent = 'Немає вибраних елементів';
    } else if (count === 1) {
      targetSummary.textContent = '1 елемент вибрано';
    } else {
      targetSummary.textContent = `${count} елементи(ів) вибрано`;
    }
  }

  function resolveFillTarget(el) {
    if (!el) return null;
    const inner = el.querySelector(':scope > .st-section-inner, :scope > .st-block-inner');
    return inner || el;
  }

  function applyFillToElement(el, state) {
    const target = resolveFillTarget(el);
    if (!target) return;

    target.style.backgroundImage = '';
    target.style.backgroundColor = '';
    target.style.background = 'none';
    target.style.opacity = '';

    if (state.mode === 'color') {
      const col = hexToRgba(state.colorRaw, state.alpha);
      target.style.background = col;
    } else if (state.mode === 'gradient') {
      const c1 = hexToRgba(state.grad1Raw, state.alpha);
      const c2 = hexToRgba(state.grad2Raw, state.alpha);
      target.style.background = `linear-gradient(${state.dir}, ${c1}, ${c2})`;
    } else if (state.mode === 'image') {
      if (state.imageUrl) {
        const size = state.imageSize || 'cover';
        const pos  = state.imagePosition || 'center center';
        target.style.background = `url("${state.imageUrl}") ${pos} / ${size} no-repeat`;
      } else {
        target.style.background = 'none';
      }
    }

    if (state.grayscale) {
      target.style.filter = 'grayscale(1)';
    } else {
      target.style.filter = '';
    }
  }

  function applyFill() {
    const targets = getTargets();
    const state = getFillStateFromUI();
    targets.forEach(el => applyFillToElement(el, state));
    updateTargetSummary(targets);
  }

  // ---------- прозорість / ч-б ----------
  if (opacityRange && opacityNumber) {
    const sync = (fromSlider) => {
      if (fromSlider) {
        opacityNumber.value = opacityRange.value;
      } else {
        let v = Number(opacityNumber.value);
        if (!Number.isFinite(v)) v = 100;
        v = Math.max(0, Math.min(100, v));
        opacityNumber.value = String(v);
        opacityRange.value = String(v);
      }
      applyFill();
    };
    opacityRange.addEventListener('input', () => sync(true));
    opacityNumber.addEventListener('change', () => sync(false));
  }

  if (grayscaleChk) {
    grayscaleChk.addEventListener('change', () => applyFill());
  }

  // ---------- кольори ----------
  function bindColorPair(colorEl, textEl) {
    if (!colorEl || !textEl) return;
    colorEl.addEventListener('input', () => {
      const hex = normalizeHex(colorEl.value);
      textEl.value = hex;
      applyFill();
    });
    textEl.addEventListener('change', () => {
      const hex = normalizeHex(textEl.value);
      textEl.value = hex;
      colorEl.value = hex;
      applyFill();
    });
  }

  bindColorPair(colorInput, colorText);
  bindColorPair(grad1Input, grad1Text);
  bindColorPair(grad2Input, grad2Text);

  [gradDirSelect, imageSizeSelect, imagePosSelect].forEach(sel => {
    if (!sel) return;
    sel.addEventListener('change', () => applyFill());
  });
  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', () => applyFill());
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => applyFill());
  }

  // ---------- синхронізація UI з вибором ----------
  function updateUIFromSelection() {
    const targets = getTargets();
    updateTargetSummary(targets);
    if (!targets.length) return;
    const el = resolveFillTarget(targets[0]);
    if (!el) return;

    const cs = window.getComputedStyle(el);
    const bgImg = cs.backgroundImage;
    const bgCol = cs.backgroundColor;

    if (bgImg && bgImg !== 'none' && bgImg.includes('gradient')) {
      setMode('gradient');
    } else if (bgImg && bgImg !== 'none' && bgImg.includes('url(')) {
      setMode('image');
      const m = bgImg.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1] && imageUrlInput) {
        imageUrlInput.value = m[1];
      }
    } else {
      setMode('color');
      if (bgCol && bgCol !== 'rgba(0, 0, 0, 0)' && bgCol !== 'transparent') {
        const parsed = rgbaToHexAlpha(bgCol);
        const hex = parsed.hex;
        const alpha = parsed.alpha;
        if (colorInput) colorInput.value = hex;
        if (colorText) colorText.value = hex;
        const percent = Math.round(alpha * 100);
        const clamped = Math.max(0, Math.min(100, percent || 100));
        if (opacityRange)  opacityRange.value  = String(clamped);
        if (opacityNumber) opacityNumber.value = String(clamped);
      }
    }
  }

  function initSelectionSync() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) return;

    // Ctrl+клік: додаємо/знімаємо з manualTargets
    siteRoot.addEventListener('click', (e) => {
      const block = e.target.closest('.st-block, .st-section');
      if (!block || !siteRoot.contains(block)) {
        manualTargets = [];
        queueMicrotask(updateUIFromSelection);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        cleanManualTargets();
        const idx = manualTargets.indexOf(block);
        if (idx >= 0) {
          manualTargets.splice(idx, 1);
        } else {
          manualTargets.push(block);
        }
      } else {
        // звичайний клік — один елемент
        manualTargets = [block];
      }

      queueMicrotask(updateUIFromSelection);
    });

    // якщо інший код змінює is-active / is-selected
    const mo = new MutationObserver((mutations) => {
    let needSummary = false;
    let needKinds = false;

    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];

      // Якщо міняється клас у блоків/секцій — оновлюємо текст підсумку
      if (m.type === 'attributes') {
        needSummary = true;
      }

      // Якщо міняється структура (додали/видалили блоки) —
      // і увімкнені гіди контейнерів/блоків, потрібно оновити типи
      if (m.type === 'childList' && (guidesState.containers || guidesState.blocks)) {
        needKinds = true;
      }
    }

    if (needSummary) {
      setTimeout(updateTargetSummaryText, 0);
    }

    if (needKinds) {
      markBlockGuideKinds();
    }
  });

  mo.observe(siteRoot, {
    attributes: true,
    subtree: true,
    attributeFilter: ['class'],
    childList: true
  });


    updateUIFromSelection();
  }

  initSelectionSync();
}
