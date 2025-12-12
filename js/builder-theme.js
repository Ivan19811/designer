// js/builder-theme.js
// Перемикання тем конструктора (світла / темна / користувацька).

export function initThemeControls() {
  const root = document.getElementById('builder-root');
  const select = document.getElementById('builder-theme-select');

  if (!root || !select) return;

  // Початкове значення з localStorage (якщо є)
  const saved = localStorage.getItem('builder_theme');
  if (saved && (saved === 'light' || saved === 'dark' || saved === 'custom')) {
    select.value = saved;
    applyTheme(root, saved);
  } else {
    // дефолт = light
    applyTheme(root, select.value || 'light');
  }

  select.addEventListener('change', () => {
    const value = select.value;
    applyTheme(root, value);
    localStorage.setItem('builder_theme', value);
  });
}

function applyTheme(root, value) {
  root.classList.remove('builder--theme-light', 'builder--theme-dark', 'builder--theme-custom');

  if (value === 'dark') {
    root.classList.add('builder--theme-dark');
  } else if (value === 'custom') {
    root.classList.add('builder--theme-custom');
  } else {
    root.classList.add('builder--theme-light');
  }
}
