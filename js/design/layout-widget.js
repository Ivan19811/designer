// js/design/layout-widget.js
// Віджет "Розмітка" — працює з активними блоками / секціями

export function initLayoutWidget(host, getSelection) {
  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section is-open';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Розмітка</span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>



    
    <div class="design-section__body">
      <!-- Орієнтація -->
      <div class="design-field">
        <div class="design-field__label">Розташування блоків</div>
        <div class="design-field__row">
          <div class="design-pill-group" data-layout-orient>
            <button class="design-pill is-active" data-val="row">Горизонтально</button>
            <button class="design-pill" data-val="column">Вертикально</button>
          </div>
        </div>
      </div>

      <!-- Вирівнювання -->
      <div class="design-field">
        <div class="design-field__label">Вирівнювання</div>
        <div class="design-field__row">
          <div class="design-pill-group" data-layout-align>
            <button class="design-pill is-active" data-val="flex-start">Зліва / Зверху</button>
            <button class="design-pill" data-val="center">По центру</button>
            <button class="design-pill" data-val="flex-end">Справа / Знизу</button>
            <button class="design-pill" data-val="stretch">Розтягнути</button>
          </div>
        </div>
      </div>

      <!-- Відстань між блоками -->
      <div class="design-field">
        <div class="design-field__label">Відстань між блоками (px)</div>
        <div class="design-field__row">
          <input type="range" min="0" max="64" step="1"
                 value="16" class="design-slider" data-layout-gap>
          <input type="number" min="0" max="64" step="1"
                 value="16" class="design-number" data-layout-gap-input>
        </div>
      </div>

      <!-- Зовнішні відступи -->
      <div class="design-field">
        <div class="design-field__label">Відступи зовнішні (margin, px)</div>
        <div class="design-quad-grid" data-layout-margin>
          <input type="number" class="design-number" placeholder="T">
          <input type="number" class="design-number" placeholder="R">
          <input type="number" class="design-number" placeholder="B">
          <input type="number" class="design-number" placeholder="L">
        </div>
      </div>

      <!-- Внутрішні відступи -->
      <div class="design-field">
        <div class="design-field__label">Відступи внутрішні (padding, px)</div>
        <div class="design-quad-grid" data-layout-padding>
          <input type="number" class="design-number" placeholder="T">
          <input type="number" class="design-number" placeholder="R">
          <input type="number" class="design-number" placeholder="B">
          <input type="number" class="design-number" placeholder="L">
        </div>
      </div>
    </div>
  `;

  host.appendChild(sectionEl);

  // Акордеон: клік по заголовку — відкриття / закриття
  const headerBtn = sectionEl.querySelector('.design-section__header');
  headerBtn.addEventListener('click', () => {
    sectionEl.classList.toggle('is-open');
  });

  // --------- ЛОГІКА ЗАСТОСУВАННЯ ДО ВИБОРУ ---------

  function getTargetRowsAndBlocks() {
    const sel = getSelection();
    if (!sel || !sel.elements.length) return { rows: [], blocks: [] };

    if (sel.type === 'section') {
      const sections = sel.elements;
      const rows = sections
        .map(sec => sec.querySelector(':scope > .st-row'))
        .filter(Boolean);
      return { rows, blocks: [] };
    }

    if (sel.type === 'block') {
      const blocks = sel.elements;
      const rows = blocks
        .map(b => b.parentElement?.closest('.st-row'))
        .filter(Boolean);
      return { rows, blocks };
    }
    return { rows: [], blocks: [] };
  }

  // Орієнтація
  const orientGroup = sectionEl.querySelector('[data-layout-orient]');
  orientGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.design-pill');
    if (!btn) return;

    orientGroup.querySelectorAll('.design-pill').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const val = btn.dataset.val; // 'row' | 'column'
    const { rows } = getTargetRowsAndBlocks();
    rows.forEach(row => {
      // 🔹 записуємо орієнтацію в dataset, щоб canvas знав, як малювати DnD-лінії
      row.dataset.layoutOrient = val; // 'row' = горизонталь, 'column' = вертикаль

      if (val === 'row') {
        // Горизонтальний режим: кілька колонок, розподіл робить applyFrs
        row.style.gridAutoFlow = 'column';
        // gridTemplateColumns не чіпаємо — ним керує applyFrs(...)
      } else {
        // Вертикальний режим: один стовпець, блоки підряд
        row.style.gridAutoFlow = 'row';
        row.style.gridTemplateColumns = '1fr';
      }
    });
  });



  // Вирівнювання (по головній осі)
  const alignGroup = sectionEl.querySelector('[data-layout-align]');
  alignGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.design-pill');
    if (!btn) return;

    alignGroup.querySelectorAll('.design-pill').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const val = btn.dataset.val; // flex-start / center / flex-end / stretch

    const { rows } = getTargetRowsAndBlocks();
    rows.forEach(row => {
      // у нас grid, тому користуємося align-items / justify-items
      if (val === 'stretch') {
        row.style.alignItems = 'stretch';
      } else {
        row.style.alignItems = val;
      }
    });
  });

  // GAP
  const gapSlider = sectionEl.querySelector('[data-layout-gap]');
  const gapInput  = sectionEl.querySelector('[data-layout-gap-input]');

  function applyGap(val) {
    const num = Math.max(0, Math.min(64, Number(val) || 0));
    gapSlider.value = String(num);
    gapInput.value  = String(num);

    const { rows } = getTargetRowsAndBlocks();
    rows.forEach(row => {
      row.style.columnGap = num + 'px';
      row.style.rowGap    = num + 'px';
      row.style.gap       = num + 'px';
    });
  }

  gapSlider.addEventListener('input', () => applyGap(gapSlider.value));
  gapInput.addEventListener('change', () => applyGap(gapInput.value));

  // MARGIN / PADDING
  const marginGrid  = sectionEl.querySelector('[data-layout-margin]');
  const paddingGrid = sectionEl.querySelector('[data-layout-padding]');

  function applyBoxValues(gridEl, mode) {
    const inputs = [...gridEl.querySelectorAll('input')];
    const [t, r, b, l] = inputs.map(inp => {
      const v = Number(inp.value);
      return Number.isFinite(v) ? v : 0;
    });

    const { rows, blocks } = getTargetRowsAndBlocks();
    const targets = mode === 'margin' ? rows.concat(blocks) : rows.concat(blocks);

    targets.forEach(el => {
      if (mode === 'margin') {
        el.style.marginTop    = t + 'px';
        el.style.marginRight  = r + 'px';
        el.style.marginBottom = b + 'px';
        el.style.marginLeft   = l + 'px';
      } else {
        el.style.paddingTop    = t + 'px';
        el.style.paddingRight  = r + 'px';
        el.style.paddingBottom = b + 'px';
        el.style.paddingLeft   = l + 'px';
      }
    });
  }

  marginGrid.addEventListener('change', () => applyBoxValues(marginGrid, 'margin'));
  paddingGrid.addEventListener('change', () => applyBoxValues(paddingGrid, 'padding'));
}
