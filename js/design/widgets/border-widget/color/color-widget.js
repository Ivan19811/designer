// js/design/widgets/border-widget/color/color-widget.js
// Віджет "Колір лінії" для бордера:
// - Суцільний колір
// - Градієнт 2 кольори + розподіл (0–100%)
// - Прозорість
// - Перехід до Ч/Б

export function initBorderColorWidget(host) {
  if (!host) return;

 const state = {
    mode: 'solid',          // 'solid' | 'gradient'
    solidColor: '#38bdf8',  // суцільний колір
    gradColor1: '#38bdf8',  // колір 1 для градієнта
    gradColor2: '#facc15',  // колір 2 для градієнта
    gradSplit: 50,          // % скільки займає колір 1 (0–100)
    gradBlend: 0,           // % ширини м'якого переходу (0–50)
    opacity: 100,           // 0–100
    desaturate: 0           // 0–100 (0 = повний колір, 100 = Ч/Б)
  };

  function emitChange() {
    // Глобальна подія — border-widget слухає її і застосовує колір до таргетів
    window.dispatchEvent(
      new CustomEvent('st:borderColorChange', {
        detail: { state: { ...state } }
      })
    );
  }

  host.innerHTML = `
    <div class="design-field">
      <div class="design-field__label">Режим кольору</div>
      <div class="design-pill-row" data-color-mode-row>
        <button type="button" class="design-pill is-active" data-color-mode="solid">
          Суцільний
        </button>
        <button type="button" class="design-pill" data-color-mode="gradient">
          Градієнт
        </button>
      </div>
    </div>

    <!-- СУЦІЛЬНИЙ КОЛІР -->
    <div class="design-field" data-color-solid-panel>
      <div class="design-field__label">Суцільний колір лінії</div>
      <div class="color-solid-row">
        <input type="color" data-color-solid-picker value="#38bdf8" />
        <input type="text" data-color-solid-input value="#38bdf8" />
      </div>
      <p class="design-subnote">
        Використовується для всіх стилів ліній. Для декоративних бордерів
        (хвиля / крапки / зірочки) у наступних версіях підключимо повну підтримку.
      </p>
    </div>

    <!-- ГРАДІЄНТ -->
    <div class="design-field" data-color-gradient-panel hidden>
      <div class="design-field__label">Градієнт лінії (2 кольори)</div>

      <div class="color-gradient-colors">
        <div class="color-gradient-color">
          <span>Колір 1</span>
          <input type="color" data-color-grad1 value="#38bdf8" />
        </div>
        <div class="color-gradient-color">
          <span>Колір 2</span>
          <input type="color" data-color-grad2 value="#facc15" />
        </div>
      </div>

      <div class="color-gradient-split">
        <div class="color-gradient-split-label">
          Розподіл (Колір 1 / Колір 2):
          <span data-color-grad-split-label>50% / 50%</span>
        </div>
        <input type="range" min="0" max="100" value="50" data-color-grad-split />
      </div>

       <div class="color-gradient-blend">
        <div class="color-gradient-blend-label">
          Змішування (м'якість переходу):
          <span data-color-grad-blend-label>0%</span>
        </div>
        <input type="range" min="0" max="50" value="0" data-color-grad-blend />
      </div>




      <div class="color-gradient-preview" data-color-gradient-preview></div>

      <p class="design-subnote">
        Використовується як border-gradient (можна робити стильні "кнопки-рамки"
        70% одного кольору і 30% іншого по ширині).
      </p>
    </div>

    <!-- ПРОЗОРІСТЬ + Ч/Б -->
    <div class="design-field">
      <div class="design-field__label">Прозорість та Ч/Б</div>

      <div class="color-sliders">
        <div class="color-slider-row">
          <span class="color-slider-label">Прозорість</span>
          <input type="range" min="0" max="100" value="100" data-color-opacity />
          <span class="color-slider-value" data-color-opacity-label>100%</span>
        </div>

        <div class="color-slider-row">
          <span class="color-slider-label">До Ч/Б</span>
          <input type="range" min="0" max="100" value="0" data-color-desaturate />
          <span class="color-slider-value" data-color-desaturate-label>0%</span>
        </div>
      </div>
    </div>
  `;

  // --- Пошук елементів ---
  const modeRow = host.querySelector('[data-color-mode-row]');
  const solidPanel = host.querySelector('[data-color-solid-panel]');
  const gradientPanel = host.querySelector('[data-color-gradient-panel]');

  const solidPicker = host.querySelector('[data-color-solid-picker]');
  const solidInput  = host.querySelector('[data-color-solid-input]');

  const grad1Picker = host.querySelector('[data-color-grad1]');
  const grad2Picker = host.querySelector('[data-color-grad2]');
  const gradSplit   = host.querySelector('[data-color-grad-split]');
  const gradSplitLabel = host.querySelector('[data-color-grad-split-label]');
  const gradPreview = host.querySelector('[data-color-gradient-preview]');

  const gradBlend      = host.querySelector('[data-color-grad-blend]');
  const gradBlendLabel = host.querySelector('[data-color-grad-blend-label]');





  const opacitySlider = host.querySelector('[data-color-opacity]');
  const opacityLabel  = host.querySelector('[data-color-opacity-label]');
  const desatSlider   = host.querySelector('[data-color-desaturate]');
  const desatLabel    = host.querySelector('[data-color-desaturate-label]');

  // --- Допоміжні функції ---

  function setMode(mode) {
    state.mode = mode === 'gradient' ? 'gradient' : 'solid';

    const buttons = modeRow.querySelectorAll('[data-color-mode]');
    buttons.forEach((btn) => {
      const m = btn.getAttribute('data-color-mode');
      btn.classList.toggle('is-active', m === state.mode);
    });

    if (state.mode === 'solid') {
      solidPanel.hidden = false;
      gradientPanel.hidden = true;
    } else {
      solidPanel.hidden = true;
      gradientPanel.hidden = false;
      updateGradientPreview();
    }

    emitChange();
  }

  function clampInt(val, min, max) {
    const n = Number(val);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function normalizeHex(hex) {
    if (!hex) return '#000000';
    let v = hex.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (v.length === 4) {
      // #abc → #aabbcc
      v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    if (v.length !== 7) return '#000000';
    return v.toLowerCase();
  }



     function buildGradientCss(c1, c2, split, blend) {
    const p = clampInt(split, 0, 100);
    const b = clampInt(blend, 0, 50);

    if (b === 0) {
      // Жорсткий перехід (прапор)
      return `linear-gradient(90deg, ${c1} 0%, ${c1} ${p}%, ${c2} ${p}%, ${c2} 100%)`;
    }

    const startMix = Math.max(0, p - b);
    const endMix   = Math.min(100, p + b);

    // 0..startMix — чистий колір 1
    // startMix..endMix — плавний перехід 1 → 2
    // endMix..100 — чистий колір 2
    return `linear-gradient(
      90deg,
      ${c1} 0%,
      ${c1} ${startMix}%,
      ${c2} ${endMix}%,
      ${c2} 100%
    )`;
  }










 function updateGradientPreview() {
    if (!gradPreview) return;
    const c1 = normalizeHex(state.gradColor1);
    const c2 = normalizeHex(state.gradColor2);
    const p  = clampInt(state.gradSplit, 0, 100);
    const b  = clampInt(state.gradBlend, 0, 50);
    gradPreview.style.background = buildGradientCss(c1, c2, p, b);
  }

  // --- Обробники ---

  // Перемикання між "Суцільний" / "Градієнт"
  if (modeRow) {
    modeRow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-color-mode]');
      if (!btn) return;
      const mode = btn.getAttribute('data-color-mode');
      setMode(mode);
    });
  }

  // Суцільний колір
  if (solidPicker && solidInput) {
    solidPicker.addEventListener('input', () => {
      const v = normalizeHex(solidPicker.value);
      solidInput.value = v;
      state.solidColor = v;
      emitChange();
    });

    solidInput.addEventListener('change', () => {
      const v = normalizeHex(solidInput.value);
      solidInput.value = v;
      solidPicker.value = v;
      state.solidColor = v;
      emitChange();
    });
  }

  // Градієнт — кольори
  if (grad1Picker) {
    grad1Picker.addEventListener('input', () => {
      state.gradColor1 = normalizeHex(grad1Picker.value);
      updateGradientPreview();
      emitChange();
    });
  }

  if (grad2Picker) {
    grad2Picker.addEventListener('input', () => {
      state.gradColor2 = normalizeHex(grad2Picker.value);
      updateGradientPreview();
      emitChange();
    });
  }

  // Градієнт — розподіл
  if (gradSplit && gradSplitLabel) {
    gradSplit.addEventListener('input', () => {
      const p = clampInt(gradSplit.value, 0, 100);
      state.gradSplit = p;
      gradSplitLabel.textContent = `${p}% / ${100 - p}%`;
      updateGradientPreview();
      emitChange();
    });
  }

   // Градієнт — змішування (м'якість переходу)
  if (gradBlend && gradBlendLabel) {
    gradBlend.addEventListener('input', () => {
      const v = clampInt(gradBlend.value, 0, 50);
      state.gradBlend = v;
      gradBlendLabel.textContent = `${v}%`;
      updateGradientPreview();
      emitChange();
    });
  }




  // Прозорість
  if (opacitySlider && opacityLabel) {
    opacitySlider.addEventListener('input', () => {
      const v = clampInt(opacitySlider.value, 0, 100);
      state.opacity = v;
      opacityLabel.textContent = `${v}%`;
      emitChange();
    });
  }

  // До Ч/Б
  if (desatSlider && desatLabel) {
    desatSlider.addEventListener('input', () => {
      const v = clampInt(desatSlider.value, 0, 100);
      state.desaturate = v;
      desatLabel.textContent = `${v}%`;
      emitChange();
    });
  }

  // Початковий стан
  setMode('solid');
  emitChange();
}
