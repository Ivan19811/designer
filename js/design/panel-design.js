// js/design/panel-design.js
// Головна панель "Дизайн" — підтягує окремі віджети (Розмітка, Заливка, Фон сторінки, Дерево тощо)

import { initLayoutWidget } from './layout-widget.js';
import { initPlaceholderWidget } from './placeholder-widget.js';
import { initPageTreeWidget } from './widgets/page-tree/page-tree-widget.js';
import { initPageBackgroundWidget } from './widgets/page-background/page-background-widget.js';
import { initFillWidget } from './widgets/fill/fill-widget.js';
import { initBorderWidget } from './widgets/border-widget/border-widget.js';
import { initShadowsWidget } from './widgets/shadows/shadows-widget.js';
import { initGalleryWidget } from './widgets/gallery-widget/gallery-widget.js';




const SECTIONS_STATE_KEY = 'st_design_sections_state_v1';

function loadSectionsState() {
  try {
    const raw = window.localStorage.getItem(SECTIONS_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[design-panel] Не вдалося прочитати стан секцій', e);
    return {};
  }
}

function saveSectionsState(state) {
  try {
    window.localStorage.setItem(SECTIONS_STATE_KEY, JSON.stringify(state || {}));
  } catch (e) {
    console.warn('[design-panel] Не вдалося зберегти стан секцій', e);
  }
}

function initSectionsPersistence(host) {
  if (!host) return;

  const sections = Array.from(host.querySelectorAll('.design-section'));
  if (!sections.length) return;

  let state = loadSectionsState();
  const isFirstRun = !state || Object.keys(state).length === 0;

  // Якщо ще немає стану — за замовчуванням усі секції ЗАКРИВАЄМО.
  if (isFirstRun) {
    sections.forEach(sec => {
      sec.classList.remove('is-open');
    });
  }

  // Призначаємо стабільні id і відновлюємо стан (якщо є).
  sections.forEach((sec, index) => {
    if (!sec.dataset.sectionId) {
      sec.dataset.sectionId = `design-sec-${index + 1}`;
    }
    const id = sec.dataset.sectionId;
    const stored = state && Object.prototype.hasOwnProperty.call(state, id)
      ? !!state[id]
      : null;

    if (stored !== null) {
      sec.classList.toggle('is-open', stored);
    }

    const header = sec.querySelector('.design-section__header');
    if (header && !header.dataset.sectionsStateBound) {
      header.dataset.sectionsStateBound = '1';
      header.addEventListener('click', () => {
        const current = loadSectionsState();
        const open = sec.classList.contains('is-open');
        current[id] = open;
        saveSectionsState(current);
      });
    }
  });

  // Якщо це перший запуск — фіксуємо поточний стан як базовий.
  if (isFirstRun) {
    state = {};
    sections.forEach(sec => {
      const id = sec.dataset.sectionId;
      state[id] = sec.classList.contains('is-open');
    });
    saveSectionsState(state);
  }
}

export function initDesignPanel() {
  const panelRoot = document.getElementById('design-panel-root');
  if (!panelRoot) return;

  // Основний контейнер всередині секції "Дизайн"
  const host = panelRoot.querySelector('#design-panel') || panelRoot;

  // ---- Як беремо поточне виділення на полотні ----
  function getSelection() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) {
      return { type: 'none', elements: [] };
    }

    // 1) Блоки — спочатку .is-selected (майбутній мульти-вибір),
    //    якщо немає — підстраховуємось через .is-active (поточний клік).
    let selectedBlocks = Array.from(
      siteRoot.querySelectorAll('.st-block.is-selected')
    );
    if (!selectedBlocks.length) {
      const activeBlock = siteRoot.querySelector('.st-block.is-active');
      if (activeBlock) {
        selectedBlocks = [activeBlock];
      }
    }
    if (selectedBlocks.length) {
      return { type: 'block', elements: selectedBlocks };
    }

    // 2) Секції — аналогічно.
    let selectedSections = Array.from(
      siteRoot.querySelectorAll('.st-section.is-selected')
    );
    if (!selectedSections.length) {
      const activeSection = siteRoot.querySelector('.st-section.is-active');
      if (activeSection) {
        selectedSections = [activeSection];
      }
    }
    if (selectedSections.length) {
      return { type: 'section', elements: selectedSections };
    }

    return { type: 'none', elements: [] };
  }

  // 1) Розмітка активних блоків / секцій
  initLayoutWidget(host, getSelection);

  // 2) Заливка (фон/градієнт/картинка) для вибраних елементів
  initFillWidget(host, getSelection);

  // 3) Бордери: рамка / радіуси / стилі / колір
  initBorderWidget(host, getSelection);

  // 4) Тінь / Глибина — глобальний віджет тіней
  initShadowsWidget(host, getSelection);

  // 5) Фон поточної сторінки (працює з #site-canvas)
  initPageBackgroundWidget(host);

  // 6) Дерево сторінки
  initPageTreeWidget(host, getSelection);

   // 7) Галерея (Картинки / Логотип / Іконки)
  initGalleryWidget(host);


  // 8) Майбутні групи налаштувань — поки як заглушки
  initPlaceholderWidget(host, {
    title: 'Радіуси',
    note: 'Заокруглення кутів секцій та блоків.'
  });

  initPlaceholderWidget(host, {
    title: 'Прокрутка / Скролбар',
    note: 'Налаштування внутрішнього скролу для довгих блоків.'
  });

  initPlaceholderWidget(host, {
    title: 'Робоче середовище',
    note: 'Щільність інтерфейсу, напрямок сітки та інші системні опції.'
  });

  // 8) Памʼять стану акордеонів "Дизайну"
  initSectionsPersistence(host);
}
