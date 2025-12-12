// js/design/widgets/border-widget/lines/lines-widget.js
// Підвіджет "Рамка": режим, пресети та сторони. Дає onChange + API setStateFromHost.

export function initBorderLinesWidget(host, options = {}) {
  if (!host) return;

  const { onChange } = options;

  const state = {
    mode: 'none',      // 'none' | 'on'
    preset: 'none',    // 'none' | 'thin' | 'medium' | 'thick' | 'mixed' | 'custom'
    sides: 'all'       // 'all' | 'top' | 'right' | 'bottom' | 'left' | 'tb' | 'lr'
  };

  host.innerHTML = `
    <div class="design-field">
      <div class="design-field__label">Режим рамки</div>
      <div class="design-border-mode-row" data-border-line-modes>
        <label class="design-border-flag">
          <input
            type="radio"
            name="borderLineMode"
            value="none"
            data-border-line-mode="none"
            checked
          />
          <span>Немає рамки</span>
        </label>
        <label class="design-border-flag">
          <input
            type="radio"
            name="borderLineMode"
            value="on"
            data-border-line-mode="on"
          />
          <span>Є рамка</span>
        </label>
      </div>
      <p class="design-subnote">
        Коли рамка вимкнена — інші налаштування ігноруються.
      </p>
    </div>

   <div class="design-field" data-border-line-section="presets">
  <div class="design-field__label">Товщина</div>
  <div class="design-border-presets-row" data-border-line-presets>
    <button type="button" class="design-pill" data-border-line-preset="thin">
      Тонка
    </button>
    <button type="button" class="design-pill" data-border-line-preset="medium">
      Середня
    </button>
    <button type="button" class="design-pill" data-border-line-preset="thick">
      Товста
    </button>
    <!-- 🔹 індикатор змішаних значень -->
    <button
      type="button"
      class="design-pill design-pill--ghost"
      data-border-line-preset="mixed"
    >
      Мішані
    </button>
    <button type="button" class="design-pill" data-border-line-preset="custom">
      Власна
    </button>
  </div>
</div>

    <div class="design-field" data-border-line-section="sides">
      <div class="design-field__label">Сторони рамки</div>
      <div class="design-border-sides-row" data-border-line-sides>
        <button type="button" class="design-pill" data-border-line-sides="all">Усі</button>
        <button type="button" class="design-pill" data-border-line-sides="top">Тільки зверху</button>
        <button type="button" class="design-pill" data-border-line-sides="bottom">Тільки знизу</button>
        <button type="button" class="design-pill" data-border-line-sides="left">Тільки зліва</button>
        <button type="button" class="design-pill" data-border-line-sides="right">Тільки справа</button>
        <button type="button" class="design-pill" data-border-line-sides="tb">Зверху + знизу</button>
        <button type="button" class="design-pill" data-border-line-sides="lr">Зліва + справа</button>
      </div>
    </div>
  `;

  // ---- допоміжні ----

  function logState() {
    console.log('[border-lines] state =', { ...state });
  }

  function emitChange() {
    if (typeof onChange === 'function') {
      const payload = { ...state };
      console.log('[border-lines] emitChange →', payload);
      onChange(payload);
    } else {
      console.log('[border-lines] emitChange, але onChange не переданий', { ...state });
    }
  }

  function refreshUI() {
    const presetsSection = host.querySelector('[data-border-line-section="presets"]');
    const sidesSection = host.querySelector('[data-border-line-section="sides"]');
    const disabled = state.mode === 'none';

    if (presetsSection) {
      presetsSection.classList.toggle('is-disabled', disabled);
    }
    if (sidesSection) {
      sidesSection.classList.toggle('is-disabled', disabled);
    }

    // Режим рамки (радіо)
    const modeInputs = host.querySelectorAll('[data-border-line-mode]');
    modeInputs.forEach((input) => {
      const val = input.getAttribute('data-border-line-mode') || 'none';
      input.checked = state.mode === val;
    });

    // Підсвічуємо активний пресет
    const presetBtns = host.querySelectorAll('[data-border-line-preset]');
    presetBtns.forEach((btn) => {
      const val = btn.getAttribute('data-border-line-preset');
      btn.classList.toggle('is-active', !disabled && state.preset === val);
    });

    // Підсвічуємо активні сторони
    const sideBtns = host.querySelectorAll('[data-border-line-sides]');
    sideBtns.forEach((btn) => {
      const val = btn.getAttribute('data-border-line-sides');
      btn.classList.toggle('is-active', !disabled && state.sides === val);
    });
  }

  // ---- події ----

  // Режим рамки
   const modeInputs = host.querySelectorAll('[data-border-line-mode]');
  modeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const mode = input.getAttribute('data-border-line-mode') || 'none';
      state.mode = mode;

      // ❗ Якщо включили "Є рамка", а пресет ще не вибраний — ставимо "Середня"
      if (mode === 'on' && state.preset === 'none') {
        state.preset = 'medium';
      }

      refreshUI();
      logState();
      emitChange();
    });
  });


  // Пресети
 const presetBtns = host.querySelectorAll('[data-border-line-preset]');
presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.mode === 'none') return;

    const val = btn.getAttribute('data-border-line-preset') || 'none';

    // 🔹 Кнопка "Мішані" — тільки індикатор, клік ігноруємо
    if (val === 'mixed') {
      return;
    }

    state.preset = val;
    refreshUI();
    logState();
    emitChange();
  });
});


  // Сторони
  const sideBtns = host.querySelectorAll('[data-border-line-sides]');
  sideBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.mode === 'none') return;
      const val = btn.getAttribute('data-border-line-sides') || 'all';
      state.sides = val;
      refreshUI();
      logState();
      emitChange();
    });
  });

  // ---- API для головного віджета (синхронізація зі стилями елемента) ----

  function setStateFromHost(next) {
    if (!next) return;

    if (typeof next.mode === 'string') {
      state.mode = next.mode;
    }
    if (typeof next.preset === 'string') {
      state.preset = next.preset;
    }
    if (typeof next.sides === 'string') {
      state.sides = next.sides;
    }

    refreshUI();
    logState();
    // emitChange тут НЕ викликаємо, щоб не було циклу
  }

  // первинне оновлення
  refreshUI();
  logState();
  emitChange();

  return {
    setStateFromHost
  };
}
