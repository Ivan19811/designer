// js/design/widgets/border-widget/border-style/style-widget.js
// Віджет "Стиль лінії": вибір стилю бордера (суцільна, штрихова, хвиляста, зірочки тощо).

import { getAllBorderStyles } from './presets.js';

export function initBorderStyleWidget(host, options = {}) {
  if (!host) return;

  const { onChange } = options;

  const state = {
    style: 'solid' // 'solid' | 'dashed' | ... | 'star-line' | 'user-*'
  };

  host.innerHTML = `
    <div class="design-field">
      <div class="design-field__label">Стиль лінії</div>
      <div class="border-style-buttons" data-style-buttons></div>
    </div>

    <p class="design-subnote">
      Стиль застосовується до поточного виділення: блоки, секції або лінії.
      Пізніше тут можна буде додати власні стилі зображенням.
    </p>
  `;

  const btnRoot = host.querySelector('[data-style-buttons]');

  function renderButtons() {
    const all = getAllBorderStyles();

    btnRoot.innerHTML = all.map(style => {
      const id = style.id;
      const label = style.label;

      // data-preview використаємо в CSS, щоб намалювати візуальний приклад лінії
      return `
        <button
          type="button"
          class="design-pill border-style-btn"
          data-style="${id}"
          title="${label}"
        >
          <span class="border-style-preview" data-style-preview="${id}"></span>
        </button>
      `;
    }).join('');
  }

  function emitChange() {
    if (typeof onChange === 'function') {
      onChange({ style: state.style });
    }
  }

  function refreshUI() {
    const btns = btnRoot.querySelectorAll('[data-style]');
    btns.forEach(btn => {
      const id = btn.getAttribute('data-style');
      btn.classList.toggle('is-active', id === state.style);
    });
  }

  renderButtons();
  refreshUI();

  btnRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-style]');
    if (!btn) return;

    const id = btn.getAttribute('data-style');
    if (!id) return;

    state.style = id;
    refreshUI();
    emitChange();
  });

  // Викликається ззовні (border-widget), щоб підхопити стиль із виділення
  function setStateFromHost(next) {
    if (!next || typeof next !== 'object') return;
    if (typeof next.style === 'string') {
      state.style = next.style;
      refreshUI();
    }
  }

  return { setStateFromHost };
}
