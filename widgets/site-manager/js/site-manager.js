// widgets/site-manager/js/site-manager.js
;(function () {
  const LS_KEY_SITES = 'st_sites';
  const LS_KEY_CURRENT = 'st_sites_current';
  const templateSelectEl = document.getElementById('siteTemplateSelect');
  const templateInfoEl = document.getElementById('siteTemplateInfo');






  const rootEl = document.getElementById('siteWidgetRoot');
  const panelEl = document.getElementById('sitePanel');
  const saveBtn = document.getElementById('siteSaveBtn');

  const nameEl = document.getElementById('siteName');
  const slugEl = document.getElementById('siteSlug');
  const descEl = document.getElementById('siteDescription');

  const netlifySiteNameEl = document.getElementById('netlifySiteName');
  const netlifyUrlEl = document.getElementById('netlifyUrl');
  const netlifyPublishDirEl = document.getElementById('netlifyPublishDir');
  const netlifyDeployHookEl = document.getElementById('netlifyDeployHook');

  const idViewEl = document.getElementById('siteIdView');
  const createdViewEl = document.getElementById('siteCreatedAtView');
  const updatedViewEl = document.getElementById('siteUpdatedAtView');

  const createBtn = document.getElementById('smCreateBtn');
  const openBtn = document.getElementById('smOpenBtn');
  const siteListEl = document.getElementById('smSiteList');

  // Сторінки сайту
  const addPageBtn = document.getElementById('siteAddPageBtn');
  const pagesListEl = document.getElementById('sitePagesList');

  // DEBUG-панель
  const debugEl = document.getElementById('siteDebug');
  const debugValueEl = debugEl ? debugEl.querySelector('.site-debug__value') : null;

  if (!rootEl || !panelEl) {
    return;
  }

  // ---------- Helper для подій зовні (конструктор) ----------

  function emitEvent(name, detail) {
    try {
      window.dispatchEvent(
        new CustomEvent(name, {
          detail,
          bubbles: false
        })
      );
    } catch (e) {
      console.warn('[SiteManager] Не вдалося надіслати подію', name, e);
    }
  }

  function updateDebug(site, page) {
    if (!debugValueEl) return;

    if (!site) {
      debugValueEl.textContent = '—';
      return;
    }

    const sitePart = site.slug || site.name || site.id;
    const pagePart = page
      ? page.path || page.name || page.id
      : 'без вибраної сторінки';

    debugValueEl.textContent = sitePart + '   •   ' + pagePart;
  }

  // ---------- Шаблони сайту ----------

  function getTemplates() {
    // Беремо список із site-templates.js або дефолтний
    const list =
      window.SiteTemplates && Array.isArray(window.SiteTemplates)
        ? window.SiteTemplates
        : [
            {
              key: 'dashboard-dark',
              name: 'CRM Dashboard (темна)',
              category: 'CRM / Admin',
              description:
                'Шапка, лівий сайтбар, футер, по центру — блоки для статистики і списків.'
            },
            {
              key: 'store-landing',
              name: 'Магазин — лендінг',
              category: 'Store / Landing',
              description:
                'Hero-заголовок, секція товарів, блок довіри, футер.'
            }
          ];

    return list;
  }

  function populateTemplateSelect() {
    if (!templateSelectEl) return;

    const templates = getTemplates();
    templateSelectEl.innerHTML = '';

    const optEmpty = document.createElement('option');
    optEmpty.value = '';
    optEmpty.textContent = 'Без шаблону / порожній';
    templateSelectEl.appendChild(optEmpty);

    for (const tpl of templates) {
      const opt = document.createElement('option');
      opt.value = tpl.key;
      opt.textContent = tpl.name;
      templateSelectEl.appendChild(opt);
    }
  }

  function updateTemplateInfoFromKey(key) {
    if (!templateInfoEl) return;

    if (!key) {
      templateInfoEl.textContent =
        'Обери базовий шаблон (шапка, сайтбар, футер, основний блок). Пізніше конструктор буде будувати сторінки за цим шаблоном.';
      return;
    }

    const templates = getTemplates();
    const tpl = templates.find((t) => t.key === key);
    if (!tpl) {
      templateInfoEl.textContent =
        'Обраний шаблон не знайдено. Можливо, його видалили зі списку шаблонів.';
      return;
    }

    const cat = tpl.category ? ` (${tpl.category})` : '';
    templateInfoEl.textContent = `${tpl.name}${cat}: ${tpl.description}`;
  }










  // ---------- LocalStorage helpers ----------

  function loadSites() {
    try {
      const raw = localStorage.getItem(LS_KEY_SITES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[SiteManager] Помилка читання st_sites з localStorage:', e);
      return [];
    }
  }

  function saveSites(sites) {
    try {
      localStorage.setItem(LS_KEY_SITES, JSON.stringify(sites || []));
    } catch (e) {
      console.warn('[SiteManager] Помилка збереження st_sites:', e);
    }
  }

  function getCurrentId() {
    return localStorage.getItem(LS_KEY_CURRENT) || '';
  }

  function setCurrentId(id) {
    if (id) {
      localStorage.setItem(LS_KEY_CURRENT, id);
    } else {
      localStorage.removeItem(LS_KEY_CURRENT);
    }
  }

  // ---------- Модель сайту та сторінок ----------

  function createEmptySite() {
    const now = Date.now();
    return {
      id: 'site_' + now,
      name: '',
      slug: '',
      description: '',
      createdAt: now,
      updatedAt: now,
      netlify: {
        siteName: '',
        url: '',
        publishDir: 'frontend',
        deployHook: ''
      },
      pages: [],
      currentPageId: null
    };
  }

  function createPage(name, path) {
    const now = Date.now();
    return {
      id: 'page_' + now + '_' + Math.floor(Math.random() * 1000),
      name: name || 'Нова сторінка',
      path: path || '/'
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

  function findSite(sites, id) {
    return sites.find((s) => s.id === id) || null;
  }

  // ---------- Рендер списку сайтів ----------

  function renderSiteList(sites, currentId) {
    if (!siteListEl) return;
    siteListEl.innerHTML = '';

    if (!sites.length) {
      const li = document.createElement('li');
      li.className = 'sm-site-list-empty';
      li.textContent = 'Сайтів ще немає. Створи перший.';
      siteListEl.appendChild(li);
      return;
    }

    for (const site of sites) {
      const li = document.createElement('li');
      li.className = 'sm-site-item';
      if (site.id === currentId) {
        li.classList.add('sm-site-item--active');
      }
      li.dataset.id = site.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'sm-site-item__name';
      nameSpan.textContent = site.name || 'Без назви';

      const slugSpan = document.createElement('span');
      slugSpan.className = 'sm-site-item__slug';
      slugSpan.textContent = site.slug || '—';

      li.appendChild(nameSpan);
      li.appendChild(slugSpan);

      li.addEventListener('click', () => {
        selectSite(site.id);
      });

      siteListEl.appendChild(li);
    }
  }

  // ---------- Рендер сторінок сайту ----------

  function renderPages(site) {
    if (!pagesListEl) return;

    pagesListEl.innerHTML = '';

    if (!site || !Array.isArray(site.pages) || !site.pages.length) {
      const li = document.createElement('li');
      li.className = 'site-pages__item';
      li.textContent = 'Сторінок поки немає.';
      pagesListEl.appendChild(li);
      updateDebug(site, null);
      return;
    }

    for (const page of site.pages) {
      const li = document.createElement('li');
      li.className = 'site-pages__item';
      if (page.id === site.currentPageId) {
        li.classList.add('site-pages__item--active');
      }

      const infoWrap = document.createElement('div');
      infoWrap.className = 'site-pages__item-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'site-pages__item-name';
      nameSpan.textContent = page.name || 'Без назви';

      const pathSpan = document.createElement('span');
      pathSpan.className = 'site-pages__item-path';
      pathSpan.textContent = page.path || '/';

      infoWrap.appendChild(nameSpan);
      infoWrap.appendChild(pathSpan);

      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'site-pages__item-actions';

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'site-pages__item-btn site-pages__item-btn--open';
      openBtn.title = 'Відкрити сторінку';
      openBtn.textContent = '↗';
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setActivePage(page.id);
      });

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'site-pages__item-btn site-pages__item-btn--rename';
      renameBtn.title = 'Перейменувати сторінку';
      renameBtn.textContent = '✎';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renamePage(page.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'site-pages__item-btn site-pages__item-btn--delete';
      deleteBtn.title = 'Видалити сторінку';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePage(page.id);
      });

      actionsWrap.appendChild(openBtn);
      actionsWrap.appendChild(renameBtn);
      actionsWrap.appendChild(deleteBtn);

      li.appendChild(infoWrap);
      li.appendChild(actionsWrap);

      li.addEventListener('click', () => {
        setActivePage(page.id);
      });

      pagesListEl.appendChild(li);
    }

    const currentPage =
      site.pages && site.pages.find((p) => p.id === site.currentPageId);
    updateDebug(site, currentPage || null);
  }

  // ---------- Робота з формою ----------

  function clearForm() {
    nameEl.value = '';
    slugEl.value = '';
    descEl.value = '';

    netlifySiteNameEl.value = '';
    netlifyUrlEl.value = '';
    netlifyPublishDirEl.value = 'frontend';
    netlifyDeployHookEl.value = '';

    if (templateSelectEl) {
      templateSelectEl.value = '';
    }
    updateTemplateInfoFromKey('');

    idViewEl.textContent = '—';
    createdViewEl.textContent = '—';
    updatedViewEl.textContent = '—';

    if (pagesListEl) {
      pagesListEl.innerHTML = '';
    }
    updateDebug(null, null);
  }


  function fillFormFromSite(site) {
    if (!site) {
      clearForm();
      return;
    }

    nameEl.value = site.name || '';
    slugEl.value = site.slug || '';
    descEl.value = site.description || '';

    netlifySiteNameEl.value = site.netlify?.siteName || '';
    netlifyUrlEl.value = site.netlify?.url || '';
    netlifyPublishDirEl.value = site.netlify?.publishDir || 'frontend';
    netlifyDeployHookEl.value = site.netlify?.deployHook || '';

    if (templateSelectEl) {
      templateSelectEl.value = site.templateKey || '';
    }
    updateTemplateInfoFromKey(site.templateKey || '');

    idViewEl.textContent = site.id || '—';
    createdViewEl.textContent = site.createdAt
      ? new Date(site.createdAt).toLocaleString()
      : '—';
    updatedViewEl.textContent = site.updatedAt
      ? new Date(site.updatedAt).toLocaleString()
      : '—';

    renderPages(site);
  }


   function readSiteFromForm(site) {
    const now = Date.now();
    return {
      ...site,
      name: nameEl.value.trim(),
      slug: slugEl.value.trim(),
      description: descEl.value.trim(),
      templateKey: templateSelectEl
        ? (templateSelectEl.value || '')
        : site && site.templateKey
        ? site.templateKey
        : '',
      updatedAt: now,
      netlify: {
        siteName: netlifySiteNameEl.value.trim(),
        url: netlifyUrlEl.value.trim(),
        publishDir: netlifyPublishDirEl.value.trim() || 'frontend',
        deployHook: netlifyDeployHookEl.value.trim()
      }
    };
  }


  // ---------- Основні дії з сайтами ----------

  function openSitePanel() {
    panelEl.hidden = false;

    let sites = loadSites();
    let currentId = getCurrentId();
    let current = currentId ? findSite(sites, currentId) : null;

    if (!current) {
      const index = sites.length + 1 || 1;
      const newSite = createEmptySite();
      newSite.name = 'Новий сайт ' + index;
      newSite.slug = 'site-' + index;
      ensureDefaultPage(newSite);

      sites.push(newSite);
      saveSites(sites);
      setCurrentId(newSite.id);
      current = newSite;
    } else {
      ensureDefaultPage(current);
    }

    renderSiteList(sites, current.id);
    fillFormFromSite(current);
    saveBtn.disabled = false;

    emitEvent('st-site-selected', { site: current });
    const currentPage =
      current.pages && current.pages.find((p) => p.id === current.currentPageId);
    if (currentPage) {
      emitEvent('st-page-selected', { site: current, page: currentPage });
    }
  }

  function selectSite(id) {
    let sites = loadSites();
    const site = findSite(sites, id);
    if (!site) return;

    ensureDefaultPage(site);
    setCurrentId(site.id);
    saveSites(sites);

    renderSiteList(sites, site.id);
    fillFormFromSite(site);
    saveBtn.disabled = false;

    emitEvent('st-site-selected', { site });
    const currentPage =
      site.pages && site.pages.find((p) => p.id === site.currentPageId);
    if (currentPage) {
      emitEvent('st-page-selected', { site, page: currentPage });
    }
  }

  function handleCreateClick() {
    let sites = loadSites();

    const newSite = createEmptySite();
    const index = sites.length + 1;
    newSite.name = 'Новий сайт ' + index;
    newSite.slug = 'site-' + index;
    ensureDefaultPage(newSite);

    sites.push(newSite);
    saveSites(sites);
    setCurrentId(newSite.id);

    renderSiteList(sites, newSite.id);
    fillFormFromSite(newSite);
    saveBtn.disabled = false;

    emitEvent('st-site-selected', { site: newSite });
    const currentPage =
      newSite.pages && newSite.pages.find((p) => p.id === newSite.currentPageId);
    if (currentPage) {
      emitEvent('st-page-selected', { site: newSite, page: currentPage });
    }
  }

  function handleOpenClick() {
    let sites = loadSites();
    if (!sites.length) {
      handleCreateClick();
      return;
    }

    let currentId = getCurrentId();
    let current = currentId ? findSite(sites, currentId) : null;
    if (!current) {
      current = sites[0];
      setCurrentId(current.id);
    }

    ensureDefaultPage(current);
    saveSites(sites);

    renderSiteList(sites, current.id);
    fillFormFromSite(current);
    saveBtn.disabled = false;

    emitEvent('st-site-selected', { site: current });
    const currentPage =
      current.pages && current.pages.find((p) => p.id === current.currentPageId);
    if (currentPage) {
      emitEvent('st-page-selected', { site: current, page: currentPage });
    }
  }

  function handleSaveClick() {
    let sites = loadSites();
    let currentId = getCurrentId();
    let current = currentId ? findSite(sites, currentId) : null;

    if (!current) {
      current = createEmptySite();
      ensureDefaultPage(current);
      sites.push(current);
      setCurrentId(current.id);
    }

    const updated = readSiteFromForm(current);

    const idx = sites.findIndex((s) => s.id === updated.id);
    if (idx >= 0) {
      sites[idx] = updated;
    } else {
      sites.push(updated);
    }

    saveSites(sites);
    renderSiteList(sites, updated.id);
    fillFormFromSite(updated);

    console.log('[SiteManager] Сайт збережено:', updated);
    emitEvent('st-site-updated', { site: updated });
  }

  // ---------- Дії зі сторінками ----------

  function setActivePage(pageId) {
    let sites = loadSites();
    let currentId = getCurrentId();
    let site = currentId ? findSite(sites, currentId) : null;
    if (!site) return;

    ensureDefaultPage(site);

    const target = site.pages && site.pages.find((p) => p.id === pageId);
    if (!target) return;

    site.currentPageId = pageId;
    site.updatedAt = Date.now();
    saveSites(sites);

    renderSiteList(sites, site.id);
    renderPages(site);

    emitEvent('st-page-selected', { site, page: target });
    console.log('[SiteManager] Поточна сторінка:', pageId);
  }

  function renamePage(pageId) {
    let sites = loadSites();
    let currentId = getCurrentId();
    let site = currentId ? findSite(sites, currentId) : null;
    if (!site) return;

    ensureDefaultPage(site);

    const page = site.pages.find((p) => p.id === pageId);
    if (!page) return;

    const newName = window.prompt('Нова назва сторінки:', page.name || '');
    if (!newName) return;

    page.name = newName.trim() || page.name;
    site.updatedAt = Date.now();

    saveSites(sites);
    renderPages(site);

    if (pageId === site.currentPageId) {
      emitEvent('st-page-selected', { site, page });
    }
  }

  function deletePage(pageId) {
    let sites = loadSites();
    let currentId = getCurrentId();
    let site = currentId ? findSite(sites, currentId) : null;
    if (!site) return;

    ensureDefaultPage(site);

    if (!site.pages.some((p) => p.id === pageId)) return;

    if (site.pages.length === 1) {
      window.alert('Повинна залишитись хоча б одна сторінка.');
      return;
    }

    const ok = window.confirm('Видалити цю сторінку? Її структуру буде втрачено.');
    if (!ok) return;

    site.pages = site.pages.filter((p) => p.id !== pageId);

    if (!site.pages.length) {
      ensureDefaultPage(site);
    }

    if (!site.pages.some((p) => p.id === site.currentPageId)) {
      site.currentPageId = site.pages[0].id;
    }

    site.updatedAt = Date.now();
    saveSites(sites);
    renderPages(site);

    const currentPage =
      site.pages && site.pages.find((p) => p.id === site.currentPageId);
    if (currentPage) {
      emitEvent('st-page-selected', { site, page: currentPage });
    }
  }

  function handleAddPageClick() {
    let sites = loadSites();
    let currentId = getCurrentId();
    let site = currentId ? findSite(sites, currentId) : null;
    if (!site) return;

    ensureDefaultPage(site);

    const name = window.prompt('Назва сторінки:', 'Нова сторінка');
    if (!name) return;

    let path = window.prompt('Шлях сторінки (URL-путь, напр. /about):', '/');
    if (!path) path = '/';
    path = path.trim();
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    const page = createPage(name.trim(), path);
    site.pages = site.pages || [];
    site.pages.push(page);
    site.currentPageId = page.id;
    site.updatedAt = Date.now();

    saveSites(sites);

    renderSiteList(sites, site.id);
    renderPages(site);
    fillFormFromSite(site);

    emitEvent('st-page-selected', { site, page });
  }

  // ---------- Ініціалізація ----------

  function init() {
    saveBtn.disabled = true;

    if (createBtn) createBtn.addEventListener('click', handleCreateClick);
    if (openBtn) openBtn.addEventListener('click', handleOpenClick);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveClick);
    if (addPageBtn) addPageBtn.addEventListener('click', handleAddPageClick);
  // Заповнюємо список шаблонів
    populateTemplateSelect();

    if (templateSelectEl) {
      templateSelectEl.addEventListener('change', () => {
        updateTemplateInfoFromKey(templateSelectEl.value);
      });
    }




    openSitePanel();
  }

  init();

  // ---------- Експорт у глобал для майбутньої інтеграції ----------

  window.SiteManager = window.SiteManager || {};
  window.SiteManager.openPanel = openSitePanel;
  window.SiteManager.loadSites = loadSites;
})();
