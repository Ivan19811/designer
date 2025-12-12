// js/panel-page-tree.js
// "Дерево сторінки" в інспекторі (панель Блоки).
// Показує поточні секції/ряди/блоки з siteState.
// Вибір:
//   - один блок або одна секція за замовчуванням;
//   - кілька блоків / кілька секцій тільки з Ctrl;
//   - не можна міксувати блоки та секції в одній вибірці.

import { siteState } from './site-state.js';

export function initPageTreePanel() {
  const toggleBtn = document.getElementById('toggle-page-tree');
  const wrap      = document.getElementById('page-tree-wrap');
  const treeRoot  = document.getElementById('page-tree-root');
  const siteRoot  = document.getElementById('site-root');

  if (!toggleBtn || !wrap || !treeRoot || !siteRoot) return;

  let treeVisible = false;

  // --- стан вибору ---
  const selectedBlockIds = new Set();
  const selectedRowIds   = new Set();
  let selectionMode      = null; // "block" | "row" | null

  // ---------- helpers: очистка / оновлення відображення ----------

  function resetSelection() {
    selectedBlockIds.clear();
    selectedRowIds.clear();
    selectionMode = null;
  }

function updateCanvasSelection(scrollTargetEl = null) {
  // прибираємо старі підсвітки + групове виділення
  siteRoot
    .querySelectorAll(
      '.st-block.is-active, .st-section.is-active, .st-block.is-selected, .st-section.is-selected'
    )
    .forEach(el => {
      el.classList.remove('is-active');
      el.classList.remove('is-selected');
    });

  // секції (ряди) → секція стає і активною, і вибраною
  selectedRowIds.forEach(rowId => {
    const rowEl = siteRoot.querySelector(`.st-row[data-uid="${rowId}"]`);
    if (!rowEl) return;
    const secEl = rowEl.closest('.st-section') || rowEl;
    if (secEl) {
      secEl.classList.add('is-active');
      secEl.classList.add('is-selected');
    }
  });

  // блоки → теж активні + selected
  selectedBlockIds.forEach(blockId => {
    const blockEl = siteRoot.querySelector(`.st-block[data-uid="${blockId}"]`);
    if (!blockEl) return;
    blockEl.classList.add('is-active');
    blockEl.classList.add('is-selected');
  });

  if (scrollTargetEl) {
    scrollTargetEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

  function updateTreeSelection() {
    // прибираємо старі підсвітки
    treeRoot
      .querySelectorAll('.page-tree-row--active, .page-tree-block--active')
      .forEach(el => {
        el.classList.remove('page-tree-row--active');
        el.classList.remove('page-tree-block--active');
      });

    // секції
    selectedRowIds.forEach(rowId => {
      const node = treeRoot.querySelector(`[data-row-id="${rowId}"]`);
      if (node) node.classList.add('page-tree-row--active');
    });

    // блоки
    selectedBlockIds.forEach(blockId => {
      const node = treeRoot.querySelector(`[data-block-id="${blockId}"]`);
      if (node) node.classList.add('page-tree-block--active');
    });
  }

  // ---------- вибір блоків / секцій ----------

  function selectBlock(blockId, { append = false, scroll = false } = {}) {
    if (!blockId) return;

    // якщо зараз режим секцій або append=false → скидаємо все і починаємо режим "block"
    if (!append || selectionMode === 'row' || selectionMode === null) {
      resetSelection();
      selectionMode = 'block';
    }

    // toggle для Ctrl: якщо вже вибраний — знімаємо, якщо ні — додаємо
    if (append && selectedBlockIds.has(blockId)) {
      selectedBlockIds.delete(blockId);
    } else {
      selectedBlockIds.add(blockId);
    }

    const blockEl = siteRoot.querySelector(`.st-block[data-uid="${blockId}"]`);
    updateCanvasSelection(!append && scroll ? blockEl : null);
    updateTreeSelection();
  }

  function selectRow(rowId, { append = false, scroll = false } = {}) {
    if (!rowId) return;

    // якщо зараз режим блоків або append=false → скидаємо все і починаємо режим "row"
    if (!append || selectionMode === 'block' || selectionMode === null) {
      resetSelection();
      selectionMode = 'row';
    }

    if (append && selectedRowIds.has(rowId)) {
      selectedRowIds.delete(rowId);
    } else {
      selectedRowIds.add(rowId);
    }

    const rowEl = siteRoot.querySelector(`.st-row[data-uid="${rowId}"]`);
    const secEl = rowEl && (rowEl.closest('.st-section') || rowEl);

    updateCanvasSelection(!append && scroll ? secEl : null);
    updateTreeSelection();
  }

  // ---------- побудова дерева ----------

  function renderTree() {
    treeRoot.innerHTML = '';

    const rootRows = siteState.page?.rootRows || [];
    if (!rootRows.length) {
      treeRoot.innerHTML =
        '<div style="font-size:12px; opacity:.7;">Немає блоків</div>';
      return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyle     = 'none';
    ul.style.margin        = '0';
    ul.style.padding       = '0';
    ul.style.display       = 'flex';
    ul.style.flexDirection = 'column';
    ul.style.gap           = '4px';

    rootRows.forEach((rid, idx) => {
      ul.appendChild(makeRowNode(rid, idx));
    });

    treeRoot.appendChild(ul);

    // після перебудови дерева накладаємо поточну підсвітку
    updateTreeSelection();
  }

  function makeRowNode(rowId, index) {
    const row = siteState.rows[rowId];

    const li = document.createElement('li');

    const head = document.createElement('div');
    head.dataset.rowId      = rowId;
    head.textContent        = row?.name || `Секція ${index + 1}`;
    head.className          = 'page-tree-row';
    head.style.cursor       = 'pointer';
    head.style.padding      = '4px 8px';
    head.style.borderRadius = '8px';
    head.style.fontSize     = '12px';

    head.addEventListener('click', (ev) => {
      const append = ev.ctrlKey || ev.metaKey;
      selectRow(rowId, { append, scroll: !append });
    });

    if (selectedRowIds.has(rowId) && selectionMode === 'row') {
      head.classList.add('page-tree-row--active');
    }

    li.appendChild(head);

    const children = row?.children || [];
    if (children.length) {
      const ul = document.createElement('ul');
      ul.style.listStyle     = 'none';
      ul.style.margin        = '4px 0 0 12px';
      ul.style.padding       = '0';
      ul.style.display       = 'flex';
      ul.style.flexDirection = 'column';
      ul.style.gap           = '2px';

      children.forEach((bid, idx) => {
        ul.appendChild(makeBlockNode(bid, idx, 'Блок'));
      });

      li.appendChild(ul);
    }

    return li;
  }

 function makeBlockNode(blockId, index, prefix) {
  const b = siteState.blocks[blockId];

  const li = document.createElement('li');

  const line = document.createElement('div');
  line.dataset.blockId = blockId;

  // 🔹 Визначаємо тип блока (звичайний чи лінія)
  const kind = b?.kind || 'block';

  // 🔹 Формуємо підпис для дерева
  let label = b?.name || '';

  if (!label) {
    if (kind === 'line') {
      label = 'Лінія';
    } else {
      label = `${prefix} ${index + 1}`;
    }
  }

  line.textContent        = label;
  line.className          = 'page-tree-block';
  line.style.cursor       = 'pointer';
  line.style.padding      = '3px 8px';
  line.style.borderRadius = '6px';
  line.style.fontSize     = '12px';

  line.addEventListener('click', (ev) => {
    const append = ev.ctrlKey || ev.metaKey;
    selectBlock(blockId, { append, scroll: !append });
  });

  if (selectedBlockIds.has(blockId) && selectionMode === 'block') {
    line.classList.add('page-tree-block--active');
  }

  li.appendChild(line);

  if (b?.childrenRow) {
    const innerRow      = siteState.rows[b.childrenRow];
    const innerChildren = innerRow?.children || [];
    if (innerChildren.length) {
      const ul = document.createElement('ul');
      ul.style.listStyle     = 'none';
      ul.style.margin        = '4px 0 0 12px';
      ul.style.padding       = '0';
      ul.style.display       = 'flex';
      ul.style.flexDirection = 'column';
      ul.style.gap           = '2px';

      innerChildren.forEach((cid, idx) => {
        ul.appendChild(makeBlockNode(cid, idx, 'Вкладений блок'));
      });

      li.appendChild(ul);
    }
  }

  return li;
}



  // ---------- синхронізація від полотна → дерево ----------

  siteRoot.addEventListener('click', (e) => {
    const append = e.ctrlKey || e.metaKey;

    // 1) якщо клік по блоку — виділяємо блок
    const blockEl = e.target.closest('.st-block');
    if (blockEl && siteRoot.contains(blockEl)) {
      const id = blockEl.dataset.uid;
      if (id) selectBlock(id, { append, scroll: false });
      return;
    }

    // 2) якщо клік по секції (карточці) — виділяємо секцію (row)
    const secEl = e.target.closest('.st-section');
    if (secEl && siteRoot.contains(secEl)) {
      const rowEl = secEl.querySelector(':scope > .st-row');
      const rid   = rowEl && rowEl.dataset.uid;
      if (rid) selectRow(rid, { append, scroll: false });
      return;
    }

    // інших випадків не чіпаємо (клік в пусте місце полотна)
  });

  // ---------- toggle панелі ----------

  toggleBtn.addEventListener('click', () => {
    treeVisible = !treeVisible;
    wrap.style.display = treeVisible ? 'block' : 'none';
    if (treeVisible) renderTree();
  });

  // ---------- auto rebuild on DOM changes ----------

  const mo = new MutationObserver(() => {
    if (!treeVisible) return;
    renderTree();
  });
  mo.observe(siteRoot, { childList: true, subtree: true });

  // старт: панель закрита
  wrap.style.display = 'none';
}
