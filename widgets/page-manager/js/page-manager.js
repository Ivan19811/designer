// widgets/page-manager/js/page-manager.js
// Віджет "Сторінки": керування списком сторінок для поточного сайту.
// Дані беруться з localStorage так само, як у віджеті "Сайт" (ключі st_sites, st_sites_current).

;(function () {
  const LS_KEY_SITES = 'st_sites';
  const LS_KEY_CURRENT = 'st_sites_current';

  const rootEl = document.getElementById('pageWidgetRoot');
  const panelEl = document.getElementById('pagePanel');
  const siteNameEl = document.getElementById('pmSiteName');
  const pageListEl = document.getElementById('pmPageList');
  const emptyStateEl = document.getElementById('pmEmptyState');
  const createBtn = document.getElementById('pmCreatePageBtn');

  // ---------- Акордеон для секцій у сайтбарі віджета "Сторінки" ----------
  const SIDE_SECTIONS_STATE_KEY = 'st_page_widget_side_sections_v1';
  const sidePanelEl = document.getElementById('pmSidePanel');

  console.log('[PageManager] init', {
    rootEl,
    panelEl,
    sidePanelEl,
  });

  if (sidePanelEl) {
    initSideSectionsAccordion(sidePanelEl);
  }

  if (!rootEl || !panelEl) {
    return;
  }

  function initSideSectionsAccordion(host) {
    if (!host) return;

    function loadState() {
      try {
        const raw = window.localStorage.getItem(SIDE_SECTIONS_STATE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (e) {
        console.warn('[PageManager] Не вдалося прочитати стан секцій сайдбара', e);
        return {};
      }
    }

    function saveState(nextState) {
      try {
        window.localStorage.setItem(SIDE_SECTIONS_STATE_KEY, JSON.stringify(nextState || {}));
      } catch (e) {
        console.warn('[PageManager] Не вдалося зберегти стан секцій сайдбара', e);
      }
    }

    let state = loadState();
    const isFirstRun = !Object.keys(state).length;

    const sections = Array.from(host.querySelectorAll('.pm-side__section'));
    console.log('[PageManager] initSideSectionsAccordion: знайдено секцій', sections.length, sections);

    if (!sections.length) return;

    // Призначаємо стабільні id
    sections.forEach((sec, index) => {
      if (!sec.dataset.sectionId) {
        sec.dataset.sectionId = `pm-side-sec-${index + 1}`;
      }
    });

    // Перебудовуємо структуру: header + body (тільки один раз)
    sections.forEach(sec => {
      if (sec.querySelector('.pm-side__section-header')) return;

      const children = Array.from(sec.children);
      const titleEl = sec.querySelector('.pm-side__section-title');
      const subtitleEl = sec.querySelector('.pm-side__section-subtitle');

      const headerBtn = document.createElement('button');
      headerBtn.type = 'button';
      headerBtn.className = 'pm-side__section-header';

      const textWrap = document.createElement('div');
      textWrap.className = 'pm-side__section-header-text';
      if (titleEl) textWrap.appendChild(titleEl);
      if (subtitleEl) textWrap.appendChild(subtitleEl);

      const chev = document.createElement('span');
      chev.className = 'pm-side__chevron';
      chev.textContent = '▶';

      headerBtn.appendChild(textWrap);
      headerBtn.appendChild(chev);

      const body = document.createElement('div');
      body.className = 'pm-side__section-body';
      children.forEach(node => {
        if (node !== titleEl && node !== subtitleEl) {
          body.appendChild(node);
        }
      });

      sec.innerHTML = '';
      sec.appendChild(headerBtn);
      sec.appendChild(body);
    });

    // Відновлюємо стан відкритих/закритих секцій
    state = loadState();

    sections.forEach(sec => {
      const id = sec.dataset.sectionId;
      const stored = Object.prototype.hasOwnProperty.call(state, id)
        ? !!state[id]
        : false;

      if (stored) {
        sec.classList.add('is-open');
      } else {
        sec.classList.remove('is-open');
      }

      const header = sec.querySelector('.pm-side__section-header');
      if (header && !header.dataset.sectionsStateBound) {
        header.dataset.sectionsStateBound = '1';
        header.addEventListener('click', () => {
          const currentlyOpen = sec.classList.contains('is-open');
          const nextOpen = !currentlyOpen;
          sec.classList.toggle('is-open', nextOpen);

          const currentState = loadState();
          currentState[id] = nextOpen;
          saveState(currentState);

          console.log('[PageManager] toggle section', {
            id,
            nextOpen,
            currentState,
          });
        });
      }
    });

    // Якщо це перший запуск — фіксуємо базовий стан
    if (isFirstRun) {
      const baseState = {};
      sections.forEach(sec => {
        const id = sec.dataset.sectionId;
        baseState[id] = sec.classList.contains('is-open');
      });
      saveState(baseState);
    }
  }

  // ---------- helpers для localStorage ----------

  function loadSites() {
    try {
      const raw = localStorage.getItem(LS_KEY_SITES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveSites(sites) {
    try {
      localStorage.setItem(LS_KEY_SITES, JSON.stringify(sites));
    } catch (e) {
      // ignore
    }
  }

  function getCurrentSiteId() {
    try {
      const raw = localStorage.getItem(LS_KEY_CURRENT);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed.id || parsed.siteId || null;
      }
      if (typeof parsed === 'string') return parsed;
      return null;
    } catch (e) {
      return null;
    }
  }

  function findSiteById(sites, id) {
    if (!id) return null;
    return sites.find((s) => s && (s.id === id || s.slug === id)) || null;
  }

  // ---------- модель сторінки ----------

  function createPage(name, path) {
    const now = Date.now();
    return {
      id: 'page_' + now + '_' + Math.floor(Math.random() * 1000),
      name: name || 'Нова сторінка',
      path: normalisePath(path || '/'),
      // додаткові поля
      seoTitle: '',
      seoDescription: '',
      indexing: 'index', // index | noindex
      showInMenu: true,
      headerVariant: 'default', // default | custom | none
      footerVariant: 'default', // default | custom | none
      sidebarVariant: 'default', // default | custom | none
      status: 'published' // draft | published | private
    };
  }

  function ensureDefaultPage(site) {
    if (!site) return;

    if (!Array.isArray(site.pages) || !site.pages.length) {
      const page = createPage('Головна', '/');
      site.pages = [page];
      site.currentPageId = page.id;
    }

    if (!site.currentPageId && site.pages.length) {
      site.currentPageId = site.pages[0].id;
    }
  }

  function normalisePath(path) {
    if (!path) return '/';
    let p = String(path).trim();
    if (!p.startsWith('/')) p = '/' + p;
    p = p.replace(/\s+/g, '-');
    return p;
  }

  function getSiteDisplayName(site) {
    return site.name || site.title || site.slug || 'Без назви';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------- state у віджеті ----------

  let sites = loadSites();
  let currentSite = null;
  let expandedIds = new Set();
  let dragState = {
    draggedId: null,
    overId: null
  };

  function selectCurrentSite(initialSite) {
    const allSites = sites.length ? sites : loadSites();
    sites = allSites;

    if (initialSite) {
      currentSite = initialSite;
      return;
    }

    const currentId = getCurrentSiteId();
    if (currentId) {
      const byId = findSiteById(sites, currentId);
      if (byId) {
        currentSite = byId;
        return;
      }
    }

    currentSite = sites[0] || null;
  }

  selectCurrentSite(null);

  if (currentSite) {
    ensureDefaultPage(currentSite);
  }

  // ---------- render ----------

  function render() {
    // якщо немає жодного сайту
    if (!currentSite) {
      siteNameEl.textContent = '—';
      emptyStateEl.hidden = false;
      pageListEl.innerHTML = '';
      if (createBtn) createBtn.disabled = true;
      return;
    }

    if (createBtn) createBtn.disabled = false;
    emptyStateEl.hidden = true;

    siteNameEl.textContent = getSiteDisplayName(currentSite);

    const pages = Array.isArray(currentSite.pages) ? currentSite.pages : [];
    const activePageId = currentSite.currentPageId || (pages[0] && pages[0].id);

    pageListEl.innerHTML = '';

    pages.forEach((page) => {
      const card = document.createElement('article');
      card.className = 'pm-page-card';
      card.dataset.pageId = page.id;
      card.draggable = true;

      if (page.id === activePageId) {
        card.classList.add('pm-page-card--active');
      }
      if (expandedIds.has(page.id)) {
        // подробиці відкриємо після вставки в DOM
      }

      const name = page.name || 'Без назви';
      const path = page.path || '/';

      const seoTitle = page.seoTitle || '';
      const seoDescription = page.seoDescription || '';
      const indexing = page.indexing || 'index';
      const showInMenu = page.showInMenu !== false;
      const headerVariant = page.headerVariant || 'default';
      const footerVariant = page.footerVariant || 'default';
      const sidebarVariant = page.sidebarVariant || 'default';
      const status = page.status || 'published';
      const isHome = currentSite.homePageId === page.id;

      card.innerHTML = `
        <div class="pm-page-card__header">
          <div class="pm-page-card__title-wrap">
            <span class="pm-page-card__badge">СТОРІНКА</span>
            <button class="pm-page-card__title-btn" type="button" data-action="rename">
              <span class="pm-page-card__title-text">${escapeHtml(name)}</span>
            </button>
            <span class="pm-page-card__slug">${escapeHtml(path)}</span>
            ${
              isHome
                ? '<span class="pm-page-card__slug" style="background:rgba(22,163,74,0.2);border-color:rgba(34,197,94,0.8);color:#bbf7d0;">Домашня</span>'
                : ''
            }
          </div>
          <div class="pm-page-card__actions">
            <button type="button" class="pm-icon-btn pm-icon-btn--primary" data-action="open-design" title="Відкрити в дизайні">
              🎨
            </button>
            <button type="button" class="pm-icon-btn" data-action="duplicate" title="Дублювати">
              ⧉
            </button>
            <button type="button" class="pm-icon-btn" data-action="save" title="Зберегти">
              💾
            </button>
            <button type="button" class="pm-icon-btn" data-action="delete" title="Видалити">
              🗑
            </button>
            <button type="button" class="pm-icon-btn pm-icon-btn--drag" data-action="drag-handle" title="Перемістити">
              ☰
            </button>
          </div>
        </div>

        <button type="button" class="pm-page-card__more-toggle" data-action="toggle-details">
          Додаткові налаштування
          <span>▼</span>
        </button>

        <div class="pm-page-card__details" data-role="details">
          <div class="pm-page-grid">
            <div class="pm-field">
              <div class="pm-field__label">URL (slug)</div>
              <div class="pm-field__description">Шлях сторінки, використовується при публікації.</div>
              <input class="pm-input" type="text" data-field="path" value="${escapeHtml(path)}" />
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Заголовок (title)</div>
              <div class="pm-field__description">SEO-заголовок сторінки у вкладці браузера.</div>
              <input class="pm-input" type="text" data-field="seoTitle" value="${escapeHtml(seoTitle)}" />
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Опис (description)</div>
              <div class="pm-field__description">Короткий опис для пошукових систем.</div>
              <input class="pm-input" type="text" data-field="seoDescription" value="${escapeHtml(
                seoDescription
              )}" />
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Індексація</div>
              <div class="pm-field__description">Чи можна індексувати сторінку пошуковими системами.</div>
              <select class="pm-select" data-field="indexing">
                <option value="index" ${indexing === 'index' ? 'selected' : ''}>Дозволити (index)</option>
                <option value="noindex" ${indexing === 'noindex' ? 'selected' : ''}>Заборонити (noindex)</option>
              </select>
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Шапка</div>
              <div class="pm-field__description">Використати стандартну шапку чи окрему для цієї сторінки.</div>
              <select class="pm-select" data-field="headerVariant">
                <option value="default" ${headerVariant === 'default' ? 'selected' : ''}>Стандартна</option>
                <option value="custom" ${headerVariant === 'custom' ? 'selected' : ''}>Окрема для сторінки</option>
                <option value="none" ${headerVariant === 'none' ? 'selected' : ''}>Без шапки</option>
              </select>
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Футер</div>
              <div class="pm-field__description">Стандартний футер чи окремий для сторінки.</div>
              <select class="pm-select" data-field="footerVariant">
                <option value="default" ${footerVariant === 'default' ? 'selected' : ''}>Стандартний</option>
                <option value="custom" ${footerVariant === 'custom' ? 'selected' : ''}>Окремий</option>
                <option value="none" ${footerVariant === 'none' ? 'selected' : ''}>Без футера</option>
              </select>
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Сайдбар</div>
              <div class="pm-field__description">Стандартний, окремий або вимкнений для цієї сторінки.</div>
              <select class="pm-select" data-field="sidebarVariant">
                <option value="default" ${sidebarVariant === 'default' ? 'selected' : ''}>Стандартний</option>
                <option value="custom" ${sidebarVariant === 'custom' ? 'selected' : ''}>Окремий</option>
                <option value="none" ${sidebarVariant === 'none' ? 'selected' : ''}>Без сайдбара</option>
              </select>
            </div>

            <div class="pm-field">
              <div class="pm-field__label">Статус сторінки</div>
              <div class="pm-field__description">Чернетка, опублікована чи доступна лише за посиланням.</div>
              <select class="pm-select" data-field="status">
                <option value="draft" ${status === 'draft' ? 'selected' : ''}>Чернетка</option>
                <option value="published" ${status === 'published' ? 'selected' : ''}>Опублікована</option>
                <option value="private" ${status === 'private' ? 'selected' : ''}>Тільки за посиланням</option>
              </select>
            </div>

            <div class="pm-page-grid--full">
              <label class="pm-switch">
                <input type="checkbox" data-field="showInMenu" ${showInMenu ? 'checked' : ''} />
                <div>
                  <div class="pm-switch__label">Показувати в меню</div>
                  <div class="pm-switch__hint">Якщо вимкнути — сторінка не відображається у навігації сайту.</div>
                </div>
              </label>
            </div>

            <div class="pm-page-grid--full">
              <label class="pm-switch">
                <input type="checkbox" data-field="isHome" ${isHome ? 'checked' : ''} />
                <div>
                  <div class="pm-switch__label">Домашня сторінка</div>
                  <div class="pm-switch__hint">
                    Зробити цю сторінку головною (домашньою). Поточний сайт може мати тільки одну домашню сторінку.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      `;

      pageListEl.appendChild(card);

      // відкрити блок деталей, якщо він був розгорнутий
      if (expandedIds.has(page.id)) {
        const detailsEl = card.querySelector('[data-role="details"]');
        const toggleBtn = card.querySelector('[data-action="toggle-details"]');
        if (detailsEl) detailsEl.classList.add('is-open');
        if (toggleBtn && toggleBtn.querySelector('span')) {
          toggleBtn.querySelector('span').textContent = '▲';
        }
      }
    });
  }

  // ---------- оновлення сторінки в site-обʼєкті ----------

  function updatePage(pageId, updater) {
    if (!currentSite || !Array.isArray(currentSite.pages)) return;

    const pages = currentSite.pages;
    const idx = pages.findIndex((p) => p.id === pageId);
    if (idx === -1) return;

    const page = pages[idx];
    const next = updater(page) || page;
    pages[idx] = next;

    saveSites(sites);
    render();
  }

  function reorderPages(draggedId, overId) {
    if (!currentSite || !Array.isArray(currentSite.pages)) return;
    if (!draggedId || !overId || draggedId === overId) return;

    const pages = currentSite.pages;
    const fromIdx = pages.findIndex((p) => p.id === draggedId);
    const toIdx = pages.findIndex((p) => p.id === overId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const [moved] = pages.splice(fromIdx, 1);
    pages.splice(toIdx, 0, moved);

    saveSites(sites);
    render();
  }

  // ---------- події: кліки у списку ----------

  pageListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const card = btn.closest('.pm-page-card');
    if (!card) return;

    const pageId = card.dataset.pageId;
    const action = btn.dataset.action;

    if (!pageId || !action) return;

    switch (action) {
      case 'rename': {
        const page = (currentSite.pages || []).find((p) => p.id === pageId);
        if (!page) return;
        const currentName = page.name || 'Без назви';
        const nextName = window.prompt('Нова назва сторінки:', currentName);
        if (!nextName || !nextName.trim()) return;

        updatePage(pageId, (p) => {
          p.name = nextName.trim();
          return p;
        });
        break;
      }

      case 'duplicate': {
        const page = (currentSite.pages || []).find((p) => p.id === pageId);
        if (!page) return;

        const clone = {
          ...page,
          id: 'page_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          name: (page.name || 'Сторінка') + ' — копія',
          path: normalisePath((page.path || '/') + '-copy')
        };

        currentSite.pages = currentSite.pages || [];
        currentSite.pages.push(clone);
        currentSite.currentPageId = clone.id;

        saveSites(sites);
        render();
        break;
      }

      case 'delete': {
        if (!window.confirm('Видалити цю сторінку? Дію не можна скасувати.')) return;

        const pages = currentSite.pages || [];
        if (pages.length <= 1) {
          window.alert('Сайт повинен мати принаймні одну сторінку.');
          return;
        }

        const idx = pages.findIndex((p) => p.id === pageId);
        if (idx === -1) return;

        const removed = pages.splice(idx, 1)[0];

        if (currentSite.currentPageId === removed.id) {
          const next = pages[idx] || pages[idx - 1] || pages[0];
          currentSite.currentPageId = next ? next.id : null;
        }
        if (currentSite.homePageId === removed.id) {
          currentSite.homePageId = null;
        }

        saveSites(sites);
        render();
        break;
      }

      case 'save': {
        saveSites(sites);
        // невеликий візуальний фідбек
        btn.style.opacity = '0.6';
        setTimeout(() => {
          btn.style.opacity = '';
        }, 180);
        break;
      }

      case 'toggle-details': {
        const detailsEl = card.querySelector('[data-role="details"]');
        const iconSpan = btn.querySelector('span');
        if (!detailsEl) return;

        const isOpen = detailsEl.classList.toggle('is-open');
        if (iconSpan) iconSpan.textContent = isOpen ? '▲' : '▼';

        if (isOpen) {
          expandedIds.add(pageId);
        } else {
          expandedIds.delete(pageId);
        }
        break;
      }

      case 'open-design': {
        const page = (currentSite.pages || []).find((p) => p.id === pageId);
        if (!page) return;

        currentSite.currentPageId = page.id;
        saveSites(sites);

        // шлемо подію для конструктора: відкрити цю сторінку в дизайні / canvas
        try {
          window.dispatchEvent(
            new CustomEvent('st-page-selected', {
              detail: {
                site: currentSite,
                page
              },
              bubbles: false
            })
          );
        } catch (e) {
          // ignore
        }
        break;
      }

      default:
        break;
    }
  });

  // ---------- події: зміни інпутів у додаткових налаштуваннях ----

  pageListEl.addEventListener('change', (e) => {
    const target = e.target;
    if (!target.dataset || !target.dataset.field) return;

    const card = target.closest('.pm-page-card');
    if (!card) return;

    const pageId = card.dataset.pageId;
    const field = target.dataset.field;

    updatePage(pageId, (p) => {
      if (field === 'showInMenu') {
        p.showInMenu = !!target.checked;
      } else if (field === 'isHome') {
        if (target.checked) {
          currentSite.homePageId = p.id;
        } else if (currentSite.homePageId === p.id) {
          currentSite.homePageId = null;
        }
      } else if (field === 'path') {
        p.path = normalisePath(target.value);
      } else {
        p[field] = target.value;
      }
      return p;
    });
  });

  // ---------- drag & drop для сортування сторінок ---------------

  pageListEl.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.pm-page-card');
    if (!card) return;
    const handle = e.target.closest('[data-action="drag-handle"]');
    // дозволяємо drag тільки за "ручку"
    if (!handle) {
      e.preventDefault();
      return;
    }

    dragState.draggedId = card.dataset.pageId || null;
    dragState.overId = null;
    card.classList.add('pm-page-card--dragging');

    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragState.draggedId || '');
    } catch (e2) {
      // ignore
    }
  });

  pageListEl.addEventListener('dragend', (e) => {
    const card = e.target.closest('.pm-page-card');
    if (card) {
      card.classList.remove('pm-page-card--dragging');
    }
    const cards = pageListEl.querySelectorAll('.pm-page-card');
    cards.forEach((c) => c.classList.remove('pm-page-card--drag-over'));

    dragState.draggedId = null;
    dragState.overId = null;
  });

  pageListEl.addEventListener('dragover', (e) => {
    const card = e.target.closest('.pm-page-card');
    if (!card) return;

    e.preventDefault();

    const overId = card.dataset.pageId;
    if (!overId || overId === dragState.overId) return;

    dragState.overId = overId;

    const cards = pageListEl.querySelectorAll('.pm-page-card');
    cards.forEach((c) => {
      if (c.dataset.pageId === overId) {
        c.classList.add('pm-page-card--drag-over');
      } else {
        c.classList.remove('pm-page-card--drag-over');
      }
    });
  });

  pageListEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const card = e.target.closest('.pm-page-card');
    if (!card) return;

    const overId = card.dataset.pageId || null;
    const draggedId = dragState.draggedId;

    if (draggedId && overId) {
      reorderPages(draggedId, overId);
    }

    dragState.draggedId = null;
    dragState.overId = null;
  });

  // ---------- кнопка "Створити сторінку" ------------------------

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      if (!currentSite) return;

      const name = window.prompt('Назва нової сторінки:', 'Нова сторінка');
      if (!name || !name.trim()) return;

      const safeName = name.trim();
      const pathBase = safeName
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'page';

      const existingPaths = (currentSite.pages || []).map((p) => p.path || '/');
      let candidate = '/' + pathBase;
      let counter = 2;
      while (existingPaths.includes(candidate)) {
        candidate = '/' + pathBase + '-' + counter++;
      }

      const page = createPage(safeName, candidate);
      currentSite.pages = currentSite.pages || [];
      currentSite.pages.push(page);
      currentSite.currentPageId = page.id;

      saveSites(sites);
      render();
    });
  }

  // ---------- слухачі подій від "Сайту" (інтеграція) ------------

  function handleSiteEvent(e) {
    const d = e.detail || {};
    const site = d.site || d.currentSite || d.siteData || null;

    if (site) {
      sites = loadSites();
      const freshSite = findSiteById(sites, site.id || site.slug || site.name) || site;
      currentSite = freshSite;
      ensureDefaultPage(currentSite);
      render();
    }
  }

  ['st-site-selected', 'st-site-open'].forEach((evtName) => {
    window.addEventListener(evtName, handleSiteEvent);
  });

  // ---------- стартовий render ---------------------------------

  render();

  // ---------- експорт у глобал для конструктора ----------------

  window.PageManager = window.PageManager || {};
  window.PageManager.openPanel = function () {
    try {
      panelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      // ignore
    }
  };
  window.PageManager.loadSites = loadSites;
})();
