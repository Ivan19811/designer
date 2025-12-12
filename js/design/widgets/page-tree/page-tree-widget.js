// js/design/widgets/page-tree/page-tree-widget.js
// Віджет "Дерево сторінки" для панелі "Дизайн" (правий сайтбар).

import { initPageTreePanel } from '../../../panel-page-tree.js';

/**
 * Ініціалізує секцію "Дерево сторінки" в панелі "Дизайн".
 *
 * @param {HTMLElement} host         Контейнер всередині #design-panel-root
 * @param {Function}    getSelection Функція з panel-design.js (поки не використовуємо,
 *                                   але залишаємо для майбутніх допрацювань).
 */
export function initPageTreeWidget(host, getSelection) {
  if (!host) return;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section is-open design-section--page-tree';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Дерево</span>
        <span class="design-section__header-subtitle">
       
        </span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>

    <div class="design-section__body">
      <div class="design-field">
        <div class="design-field__label">Робота з деревом сторінки</div>
        <p class="design-help-text">
          Структура секцій, рядів та блоків
          Клік по елементу виділяє його на полотні. Затисни <b>Ctrl</b>, щоб обирати кілька
          секцій або блоків одного типу.
        </p>
      </div>

      <div class="design-field design-page-tree__controls">
        <button
          type="button"
          id="toggle-page-tree"
          class="design-page-tree__toggle"
        >
          <span class="design-page-tree__toggle-dot"></span>
          <span>Показати / сховати дерево</span>
        </button>
      </div>

      <div class="design-field" id="page-tree-wrap">
        <div id="page-tree-root"></div>
      </div>
    </div>
  `;

  // Акордеон: хедер відкриває/закриває секцію
  const headerBtn = sectionEl.querySelector('.design-section__header');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      sectionEl.classList.toggle('is-open');
    });
  }

  // Додаємо секцію до панелі "Дизайн"
  host.appendChild(sectionEl);

  // Після того як DOM-елементи з id="toggle-page-tree", "page-tree-wrap", "page-tree-root"
  // реально є в документі — ініціалізуємо основну логіку дерева.
  initPageTreePanel();
}
