// js/panel-site.js
// Панель "Сайт" у додатковому сайдбарі.
// Тут показуємо ДЕРЕВО САЙТА (сторінки).
// Поки немає глобального state сторінок — тримаємо у localStorage,
// але зроблено так, щоб потім легко підключити реальний state.

export function initSitePanel() {
  const panel = document.getElementById('site-panel-root');
  if (!panel) return;

  panel.innerHTML = `
    <h2 class="builder__panel-title">Сайт</h2>
    <p class="builder__panel-note">Дерево сайта: всі сторінки і їх порядок.</p>

    <div class="builder__field-group">
      <div class="builder__field-group-label">Сторінки</div>
      <div id="site-tree-root"></div>

      <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
        <!-- 🔹 НОВА КНОПКА ДЛЯ СЕКЦІЇ В ПАНЕЛІ "САЙТ" -->
        <button id="site-add-section" class="builder__header-btn" type="button">
          + Нова секція
        </button>

        <button id="site-add-page" class="builder__primary-btn" type="button">
          + Додати сторінку
        </button>
        <button id="site-save-pages" class="builder__header-btn" type="button">
          Зберегти
        </button>
      </div>
    </div>
  `;

  const treeRoot   = panel.querySelector('#site-tree-root');
  const addPageBtn = panel.querySelector('#site-add-page');
  const saveBtn    = panel.querySelector('#site-save-pages');
  const addSectBtn = panel.querySelector('#site-add-section');

  const STORAGE_KEY = 'st_site_pages_v1';

  function loadPages() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const pages = raw ? JSON.parse(raw) : null;
      if (Array.isArray(pages) && pages.length) return pages;
    } catch (e) {}
    return [{ id: 'page_home', title: 'Головна', slug: '/' }];
  }

  function savePages(pages) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  }

  let pages = loadPages();
  let activePageId = pages[0]?.id || 'page_home';

  function render() {
    if (!treeRoot) return;

    treeRoot.innerHTML = '';
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    ul.style.display = 'flex';
    ul.style.flexDirection = 'column';
    ul.style.gap = '6px';

    pages.forEach((p, idx) => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '6px';
      li.style.padding = '6px 8px';
      li.style.borderRadius = '10px';
      li.style.border = '1px solid rgba(148,163,184,0.45)';
      li.style.background = activePageId === p.id ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.5)';
      li.style.cursor = 'pointer';

      const title = document.createElement('input');
      title.type = 'text';
      title.value = p.title || `Сторінка ${idx + 1}`;
      title.style.flex = '1';
      title.style.border = 'none';
      title.style.background = 'transparent';
      title.style.color = 'inherit';
      title.style.outline = 'none';
      title.style.fontSize = '12px';

      title.addEventListener('input', () => {
        p.title = title.value;
      });

      li.addEventListener('click', (e) => {
        if (e.target === title) return;
        activePageId = p.id;
        render();
      });

      const del = document.createElement('button');
      del.textContent = '✕';
      del.className = 'builder__header-btn';
      del.style.padding = '2px 8px';
      del.title = 'Видалити сторінку';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        pages = pages.filter(x => x.id !== p.id);
        if (!pages.length) {
          pages = [{ id: 'page_home', title: 'Головна', slug: '/' }];
        }
        if (activePageId === p.id) activePageId = pages[0].id;
        render();
      });

      li.appendChild(title);
      li.appendChild(del);
      ul.appendChild(li);
    });

    treeRoot.appendChild(ul);
  }

  // 🔹 Кнопка "Нова секція" — додаємо секцію на полотно
  addSectBtn?.addEventListener('click', () => {
    if (window.siteCanvas && typeof window.siteCanvas.addDefaultSection === 'function') {
      window.siteCanvas.addDefaultSection();
    } else {
      console.warn('[site-panel] siteCanvas.addDefaultSection() не знайдений');
    }
  });

  addPageBtn?.addEventListener('click', () => {
    const id = 'page_' + Math.random().toString(36).slice(2, 8);
    pages.push({ id, title: 'Нова сторінка', slug: `/${id}` });
    activePageId = id;
    render();
  });

  saveBtn?.addEventListener('click', () => savePages(pages));

  render();
}
