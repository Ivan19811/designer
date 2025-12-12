// js/design/placeholder-widget.js
// Простий "заглушка-віджет" для майбутніх налаштувань

export function initPlaceholderWidget(host, config) {
  if (!host) return;

  const isObj = typeof config === 'object' && config !== null;
  const title = isObj ? (config.title || 'Без назви') : String(config || 'Без назви');
  const note = isObj && config.note
    ? config.note
    : `Налаштування "<b>${title}</b>" ми додамо пізніше.`;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>${title}</span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>
    <div class="design-section__body">
      <div class="design-placeholder">
        <div class="design-placeholder__title">${title}</div>
        <div class="design-placeholder__note">${note}</div>
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
}
