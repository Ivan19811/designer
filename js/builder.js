// js/builder.js

export function initBuilderLayout() {
  const root = document.getElementById('builder-root');
  if (!root) return;

  const mainHeaderToggleBtn = root.querySelector('[data-action="toggle-main-header"]');
  const sidebarCollapseBtn  = root.querySelector('[data-action="toggle-sidebar-collapse"]');
  const sideToggleBtn       = root.querySelector('[data-action="toggle-side"]');
  const settingsSidebar     = document.getElementById('builder-settings-sidebar');
  const settingsResizer     = document.getElementById('builder-settings-resizer');
  const settingsCloseBtn    = root.querySelector('[data-action="close-settings"]');

  const sidebarPanelButtons = root.querySelectorAll('[data-open-panel]');
  const settingsTabs        = root.querySelectorAll('.builder__settings-tab');
  const settingsPanels      = root.querySelectorAll('.builder__settings-panel');

  const previewBtn = document.getElementById('btn-preview');
  const viewSelect = document.getElementById('builder-view-select');

  /* 1) Шапка вкл/викл */
  mainHeaderToggleBtn?.addEventListener('click', () => {
    const isHidden = root.classList.toggle('builder--header-hidden');
    mainHeaderToggleBtn.textContent = isHidden ? 'Показати шапку' : 'Приховати шапку';
  });

  /* 2) Collapse sidebar */
  sidebarCollapseBtn?.addEventListener('click', () => {
    const collapsed = root.classList.toggle('builder--sidebar-collapsed');
    if (collapsed) root.classList.remove('builder--sidebar-expanded');
    else root.classList.add('builder--sidebar-expanded');
  });

  /* 3) Left/right */
  sideToggleBtn?.addEventListener('click', () => {
    const isLeft = root.classList.contains('builder--side-left');
    root.classList.toggle('builder--side-left', !isLeft);
    root.classList.toggle('builder--side-right', isLeft);
  });

  /* 4) Close settings */
  settingsCloseBtn?.addEventListener('click', () => {
    settingsSidebar.style.display = 'none';
    settingsResizer.style.display = 'none';
  });

  /* 5) Open panels from main sidebar or header */
  sidebarPanelButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.getAttribute('data-open-panel');
      settingsSidebar.style.display = 'flex';
      settingsResizer.style.display = 'flex';

      activatePanel(panel);

      sidebarPanelButtons.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      settingsTabs.forEach((t) =>
        t.classList.toggle('is-active', t.getAttribute('data-panel') === panel)
      );
    });
  });

  /* 6) Tabs in settings */
  settingsTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const panel = tab.getAttribute('data-panel');
      activatePanel(panel);

      settingsTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
    });
  });

  function activatePanel(panelId) {
    settingsPanels.forEach((panel) => {
      const id = panel.getAttribute('data-panel-id');
      panel.classList.toggle('is-active', id === panelId);
    });
  }

  activatePanel('background');

  /* 7) Settings resizer */
  if (settingsSidebar && settingsResizer) {
    let isDragging = false;
    let startX = 0;
    let startWidth = settingsSidebar.getBoundingClientRect().width;

    const minW = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--builder-settings-min-w'), 10) || 260;
    const maxW = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--builder-settings-max-w'), 10) || 520;

    settingsResizer.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = settingsSidebar.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const isLeft = root.classList.contains('builder--side-left');
      const dx = e.clientX - startX;
      let newWidth = isLeft ? (startWidth + dx) : (startWidth - dx);

      if (newWidth < minW) newWidth = minW;
      if (newWidth > maxW) newWidth = maxW;

      settingsSidebar.style.width = `${newWidth}px`;
      document.documentElement.style.setProperty('--builder-settings-w', `${newWidth}px`);
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  /* 8) Preview toggle */
  previewBtn?.addEventListener('click', () => {
    const on = root.classList.toggle('builder--preview');
    previewBtn.textContent = on ? 'Вигляд конструктора' : 'Попередній перегляд';
  });

  /* 9) View select */
  if (viewSelect) {
    const savedView = localStorage.getItem('builder_view') || 'modern';
    viewSelect.value = savedView;
    root.classList.toggle('builder--view-table', savedView === 'table');

    viewSelect.addEventListener('change', () => {
      const v = viewSelect.value;
      root.classList.toggle('builder--view-table', v === 'table');
      localStorage.setItem('builder_view', v);
    });
  }
}
