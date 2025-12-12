// js/builder-init.js
// Єдина ініціалізація конструктора + інтеграція віджетів "Сайт" і "Сторінки"

import { initBuilderLayout } from './builder.js';
import { initThemeControls } from './builder-theme.js';
import { initBackgroundPanel } from './panel-background.js';
import { initConstructorPanel } from './panel-constructor.js';
// Стара окрема панель "Сайт" більше не використовується
// import { initSitePanel } from './panel-site.js';
// Дерево сторінки тепер живе в панелі "Дизайн"
// import { initPageTreePanel } from './panel-page-tree.js';
import { initDesignPanel } from './design/panel-design.js';

// ініціалізація canvas (блоки/секції)
import './site-canvas-init.js';
// js/builder-init.js
import { initDesignModeBar } from './design/design-mode-bar.js';


document.addEventListener('DOMContentLoaded', () => {
  console.log('[builder-init] DOMContentLoaded');

  // -----------------------------
  //   Базова ініціалізація конструктора
  // -----------------------------
  initBuilderLayout();
  initThemeControls();
  initBackgroundPanel();
  initConstructorPanel();
  // initSitePanel();     // не викликаємо стару панель "Сайт"
  // initPageTreePanel(); // дерево сторінки тепер окремим віджетом
  initDesignPanel();
   initDesignModeBar();

  const root = document.getElementById('builder-root');

  // -----------------------------
  //   DOM-елементи, з якими працюємо
  // -----------------------------
  const navSiteBtn  = document.getElementById('navSite');
  const navPagesBtn = document.getElementById('navPages');

  const siteManagerView = document.getElementById('siteManagerView');
  const pageManagerView = document.getElementById('pageManagerView');
  const canvasView      = document.getElementById('canvasView');
  const canvasHeader    = document.querySelector('.canvas__header');
  const canvasScroll    = document.querySelector('.canvas__scroll'); // ⬅ основний скрол полотна

  const siteTitleWrap = document.getElementById('builder-site-title');
  const siteTitleName = siteTitleWrap
    ? siteTitleWrap.querySelector('.builder-site-title__name')
    : null;

  // -----------------------------
  //   Допоміжні функції
  // -----------------------------

  function hardShow(el) {
    if (!el) return;
    el.hidden = false;
    el.style.display = '';
  }

  function hardHide(el) {
    if (!el) return;
    el.hidden = true;
    el.style.display = 'none';
  }

  // Встановити назву поточного сайту у верхній шапці
 // Встановити назву поточного сайту у верхній шапці
  function setCurrentSiteTitle(site) {
    if (!siteTitleWrap || !siteTitleName) return;

    const name =
      (site && (site.name || site.title || site.slug)) ||
      '';

    if (!name) {
      siteTitleName.textContent = '—';
      siteTitleWrap.hidden = true;
      return;
    }

    siteTitleName.textContent = name;
    siteTitleWrap.hidden = false;
  }

  // Скинути скрол полотна при перемиканні режимів
  function resetCanvasScroll() {
    if (canvasScroll) {
      canvasScroll.scrollTop = 0;
    }
  }




  // Показати віджет "Сайт"
 function showSiteManager() {
    console.log('[builder-init] showSiteManager()');
    if (root) {
      root.classList.add('builder--mode-site');
      root.classList.remove('builder--mode-pages');
    }

    resetCanvasScroll();

    hardShow(siteManagerView);
    hardHide(pageManagerView);
    hardHide(canvasView);
    hardHide(canvasHeader);





    if (window.SiteManager && typeof window.SiteManager.openPanel === 'function') {
      try {
        window.SiteManager.openPanel();
      } catch (err) {
        console.warn('[builder-init] SiteManager.openPanel() error', err);
      }
    }
  }

  // Показати віджет "Сторінки"
    function showPageManager() {
    console.log('[builder-init] showPageManager()');
    if (root) {
      root.classList.add('builder--mode-pages');
      root.classList.remove('builder--mode-site');
    }

    resetCanvasScroll();

    hardHide(siteManagerView);
    hardShow(pageManagerView);
    hardHide(canvasView);
    hardHide(canvasHeader);



    if (window.PageManager && typeof window.PageManager.openPanel === 'function') {
      try {
        window.PageManager.openPanel();
      } catch (err) {
        console.warn('[builder-init] PageManager.openPanel() error', err);
      }
    }
  }

  // Показати звичайний конструктор (canvas)
  function showCanvas() {
    console.log('[builder-init] showCanvas()');
    if (root) {
      root.classList.remove('builder--mode-site', 'builder--mode-pages');
    }

    resetCanvasScroll();

    hardHide(siteManagerView);
    hardHide(pageManagerView);
    hardShow(canvasView);
    hardShow(canvasHeader);
  }


  // -----------------------------
  //   Обробники кліків
  // -----------------------------

  // Прямі кліки по кнопкам у головному сайтбарі
  if (navSiteBtn) {
    navSiteBtn.addEventListener('click', () => {
      showSiteManager();
    });
  }

  if (navPagesBtn) {
    navPagesBtn.addEventListener('click', () => {
      showPageManager();
    });
  }

  // Делегування по всіх елементах із data-open-panel
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-panel]');
    if (btn) {
      const panel = btn.dataset.openPanel;
      console.log('[builder-init] data-open-panel click:', panel);

      if (panel === 'site') {
        // Панель "Сайт"
        showSiteManager();
      } else if (panel === 'pages') {
        // Панель "Сторінки"
        showPageManager();
      } else if (panel) {
        // Усі інші панелі → повертаємось у конструктор
        showCanvas();
      }
    }

    // Перемикання через вкладки правого сайтбара (на майбутнє)
    const tab = e.target.closest('.builder__settings-tab');
    if (tab) {
      const panel = tab.dataset.panel;
      if (panel === 'site') {
        showSiteManager();
      } else if (panel === 'pages') {
        showPageManager();
      } else if (panel) {
        showCanvas();
      }
    }
  });

  // -----------------------------
  //   Події від віджета "Сайт"
  // -----------------------------
  // Коли віджет каже "цей сайт/сторінка обрана" — оновлюємо назву і повертаємось у конструктор.
  const handleSiteEvent = (e) => {
    const d = e.detail || {};
    const site = d.site || d.currentSite || d.siteData || null;

    console.log('[builder-init] site event', e.type, d);

    if (site) {
      setCurrentSiteTitle(site);
    }
    // БЕЗ showCanvas();
  };

});
