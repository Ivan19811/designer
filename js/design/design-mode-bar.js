// js/design/design-mode-bar.js
// Глобальна панель режимів вибору (Нічого / Блоки / Секції)
// Керує кнопками у шапці "Дизайн" і шле подію st:designSelectionModeChange.

export function initDesignModeBar() {
  const bar = document.querySelector('[data-design-mode-bar]');
  if (!bar) return;

  const buttons = Array.from(bar.querySelectorAll('[data-design-mode]'));
  if (!buttons.length) return;

  function setMode(mode) {
    // підсвічуємо активну кнопку
    buttons.forEach(function (btn) {
      const btnMode = btn.getAttribute('data-design-mode');
      const active = btnMode === mode;
      btn.classList.toggle('is-active', active);
    });

    // шлемо глобальну подію для всіх віджетів (бордер, заливка і т.д.)
    try {
      const evt = new CustomEvent('st:designSelectionModeChange', {
        detail: { mode: mode }
      });
      window.dispatchEvent(evt);
    } catch (err) {
      console.warn('[design-mode-bar] Cannot dispatch event', err);
    }
  }

  bar.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-design-mode]');
    if (!btn || !bar.contains(btn)) return;
    const mode = btn.getAttribute('data-design-mode');
    if (!mode) return;
    setMode(mode);
  });

  // режим за замовчуванням — "Нічого"
  setMode('none');
}
