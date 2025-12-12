// js/panel-background.js
export function initBackgroundPanel() {
  const canvas = document.getElementById('site-canvas');
  if (!canvas) return;

  const colorInput = document.getElementById('site-bg-color');
  const imageInput = document.getElementById('site-bg-image');
  const gradientSelect = document.getElementById('site-bg-gradient');
  const overlayTopChk = document.getElementById('site-overlay-top');
  const overlayBottomChk = document.getElementById('site-overlay-bottom');
  const applyBtn = document.getElementById('site-bg-apply');

  if (!colorInput || !imageInput || !gradientSelect) return;

  let t = null; // debounce

  function applyBackground() {
    const color = colorInput.value || '#111827';
    const image = imageInput.value.trim();
    const grad  = gradientSelect.value;

    const layers = [];

    if (grad === 'blue')   layers.push('linear-gradient(135deg, #0f172a, #1d4ed8)');
    if (grad === 'sunset') layers.push('linear-gradient(135deg, #fb923c, #be123c)');
    if (grad === 'mono')   layers.push('linear-gradient(180deg, #0b1120, #111827)');

    if (image) layers.push(`url("${image}")`);
    layers.push(color);

    canvas.style.backgroundImage = layers.slice(0, -1).join(', ') || 'none';
    canvas.style.backgroundColor = layers[layers.length - 1] || color;
    canvas.style.backgroundSize = image ? 'cover' : 'auto';
    canvas.style.backgroundPosition = 'center';

    canvas.classList.toggle('overlay-top', !!overlayTopChk.checked);
    canvas.classList.toggle('overlay-bottom', !!overlayBottomChk.checked);
  }

  // Реальний час
  colorInput.addEventListener('input', applyBackground);
  gradientSelect.addEventListener('change', applyBackground);
  overlayTopChk.addEventListener('change', applyBackground);
  overlayBottomChk.addEventListener('change', applyBackground);

  imageInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(applyBackground, 250);
  });

  // Лишаємо кнопку як дубль
  if (applyBtn) applyBtn.addEventListener('click', applyBackground);

  // Стартово застосувати
  applyBackground();
}
