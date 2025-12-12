// js/site-canvas-init.js
// DnD + активний блок + вкладеність + resize.
// Витягування/перестановка: показуємо ЛИШЕ тонку лінію між блоками (без моргань/плейсхолдерів).
// ✅ Лінія тепер ставиться ПО ЦЕНТРУ проміжку між блоками.

import { siteState, ensureRow, ensureBlock } from './site-state.js';

const root = document.getElementById('site-root');
if (!root) throw new Error('site-root not found');


// 🔍 ВИВОДИМО В ГЛОБАЛЬНИЙ СКОУП ДЛЯ ДЕБАГУ
if (typeof window !== 'undefined') {
  window.siteState = siteState;
}




seedStateFromDom();

function seedStateFromDom() {
  // гарантуємо базову структуру state
  siteState.page   = siteState.page   || {};
  siteState.rows   = siteState.rows   || {};
  siteState.blocks = siteState.blocks || {};

  // 1) Зчитуємо root-ряди (як і раніше):
  //    - .st-row всередині .st-section на верхньому рівні
  //    - а також старий варіант: .st-row прямо в root (fallback)
  siteState.page.rootRows = [];

  const topRows = [
    ...root.querySelectorAll(':scope > .st-section > .st-row, :scope > .st-row')
  ];

  const seenRowIds = new Set();

  topRows.forEach((rowEl) => {
    const rowId = uid(rowEl);
    if (seenRowIds.has(rowId)) return;
    seenRowIds.add(rowId);

    siteState.page.rootRows.push(rowId);
    scanRow(rowEl); // як і раніше: читаємо блоки, вкладені рядки і т.д.
  });

  // 2) Після того як рядки/блоки прочитали — будуємо дерево секцій з DOM
  rebuildSectionsFromDom();
}


// ---------- Побудова дерева секцій з DOM ----------
function rebuildSectionsFromDom() {
  // повністю перебудовуємо список секцій
  siteState.sections = {};
  siteState.page.rootSections = [];

  const secMap = {};

  // Знаходимо ВСІ секції в root (і root, і майбутні вкладені)
  const secEls = [...root.querySelectorAll('.st-section')];

  secEls.forEach((secEl) => {
    // 1) Стабільний secId
    let secId = secEl.dataset.secId;
    if (!secId) {
      secId = 's_' + Math.random().toString(36).slice(2, 9);
      secEl.dataset.secId = secId;
    }

    // 2) Знаходимо "головний" ряд секції
    const rowEl = secEl.querySelector(':scope > .st-row');
    const rowId = rowEl ? uid(rowEl) : null;

    // 3) Знаходимо батьківську секцію (якщо ця секція вкладена в іншу)
    const parentSecEl = secEl.parentElement
      ? secEl.parentElement.closest('.st-section')
      : null;

    let parentId = null;
    if (parentSecEl) {
      let pid = parentSecEl.dataset.secId;
      if (!pid) {
        pid = 's_' + Math.random().toString(36).slice(2, 9);
        parentSecEl.dataset.secId = pid;
      }
      parentId = pid;
    }

    // 4) Створюємо / оновлюємо запис секції
    const existing = secMap[secId] || {};
    secMap[secId] = {
      id: secId,
      rowId: rowId ?? existing.rowId ?? null,
      parentId: parentId,
      children: existing.children || []
    };
  });

  // Спочатку очищаємо children, щоб не накопичувати старе
  Object.values(secMap).forEach((secState) => {
    secState.children = [];
  });

  // 5) Другий прохід — будуємо ієрархію parent / children
  Object.values(secMap).forEach((secState) => {
    if (secState.parentId && secMap[secState.parentId]) {
      secMap[secState.parentId].children.push(secState.id);
    } else {
      // немає батька → це root-секція
      siteState.page.rootSections.push(secState.id);
    }
  });

  // 6) Фіксуємо дерево секцій у state
  siteState.sections = secMap;
}






function scanRow(rowEl){
  const rowId = uid(rowEl);
  const row = ensureRow(rowId);

  const blocks = [...rowEl.querySelectorAll(':scope > .st-block')];
  row.children = blocks.map(b => uid(b));

  // fr з DOM
  row.columns = blocks.map(b => parseFloat(b.dataset.fr || '')).filter(Number.isFinite);
  if (row.columns.length !== blocks.length) {
    row.columns = blocks.map(()=>1/blocks.length);
  }

  blocks.forEach(scanBlock);
}

function scanBlock(blockEl){
  const id = uid(blockEl);
  const b = ensureBlock(id);

  // 🔹 тип блока (звичайний або лінія) з DOM
  const domKind = blockEl.dataset.blockKind || 'block';
  b.kind = domKind;

  if (domKind === 'line') {
    // Орієнтація лінії з DOM, за замовчуванням — horizontal
    const orient = blockEl.getAttribute('data-line-orientation');
    b.lineOrientation = orient === 'vertical' ? 'vertical' : 'horizontal';
  } else {
    b.lineOrientation = null;
  }

  // висота
  const h = parseFloat(blockEl.style.height || '');
  b.height = Number.isFinite(h) ? h : null;

  // чи є inner row
  const innerRow = blockEl.querySelector(':scope > .st-row');
  if (innerRow){
    const innerId = uid(innerRow);
    b.type = "block-container";
    b.childrenRow = innerId;
    scanRow(innerRow);
  } else {
    b.type = "block";
    b.childrenRow = null;
  }
}


// ✅ Повний рескан DOM → siteState (для інших модулів/дерева сторінки)
// ✅ Повний рескан DOM → siteState + синхронізація DOM
// ✅ Повний рескан DOM → siteState (використовуємо лише вручну при потребі)
function rebuildStateFromDom() {
  // гарантуємо існування page
  siteState.page = siteState.page || {};

  // очищаємо всі колекції, але не зносимо повністю siteState.page
  siteState.page.rootRows      = [];
  siteState.page.rootSections  = [];
  siteState.rows               = {};
  siteState.blocks             = {};
  siteState.sections           = {};

  // зчитуємо актуальний DOM (усі секції/ряди/блоки)
  seedStateFromDom();
}



let dragEl = null;
let dropTarget = null;
let activeEl = null;

let draggingSection = null;
let sectionsDndInited = false;

// індикатор лінії вставки
let insertLine = null;
let insertInfo = null; // { row, index }


// DnD секцій (root-level)
let dragSection = null;
let secInsertLine = null;
let secInsertInfo = null; // { index }

ensureDraggable(root);
ensureSectionDraggable(root);
ensureAllHandles(root);
normalizeAllRows(root);

initActiveSelect(root);
initDnD(root);
initResize(root);
initSectionResize(root);
initSectionDnD(root);   // ⬅ додали
bindReflowOnResize(root);

// ---------- draggable ----------
function ensureDraggable(scope) {
  scope.querySelectorAll('.st-block').forEach(b => {
    if (!b.hasAttribute('draggable')) b.setAttribute('draggable', 'true');
  });
}

// ---------- draggable sections (root level) ----------
// ---------- DnD для секцій (root-рівень) ----------




// ---------- DnD для секцій (root + вкладені) ----------
// ---------- DnD для секцій (ТІЛЬКИ ROOT-РІВЕНЬ) ----------
function ensureSectionDraggable(scope) {
  if (sectionsDndInited) return;
  sectionsDndInited = true;

  markSectionsDraggable();

  function markSectionsDraggable() {
    const secEls = [...root.querySelectorAll(':scope > .st-section')];
    secEls.forEach(sec => {
      if (!sec.hasAttribute('draggable')) {
        sec.setAttribute('draggable', 'true');
      }
    });
  }

  // старт перетягування секції
  scope.addEventListener('dragstart', (e) => {
    const sec = e.target.closest('.st-section');
    if (!sec) return;

    // якщо тягнемо блок — працює DnD блоків, секції не чіпаємо
    if (e.target.closest('.st-block')) return;

    // дозволяємо тягнути тільки root-секції (без вкладених)
    if (sec.parentElement !== root) return;

    draggingSection = sec;
    sec.classList.add('is-dragging-sec');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sec.dataset.secId || '');
    }
  });

  // наведення на іншу секцію (root) під час DnD
  scope.addEventListener('dragover', (e) => {
    if (!draggingSection) return;

    const overSec = e.target.closest('.st-section');
    if (!overSec) return;
    if (overSec.parentElement !== root) return;   // тільки root
    if (overSec === draggingSection) return;

    e.preventDefault();

    const rect = overSec.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;

    if (before) {
      if (overSec.previousSibling !== draggingSection) {
        root.insertBefore(draggingSection, overSec);
      }
    } else {
      const next = overSec.nextSibling;
      if (next !== draggingSection) {
        root.insertBefore(draggingSection, next);
      }
    }
  });

  // drop секції
  scope.addEventListener('drop', (e) => {
    if (!draggingSection) return;
    e.preventDefault();

    draggingSection.classList.remove('is-dragging-sec');
    draggingSection = null;

    // 🔄 Після зміни порядку root-секцій оновлюємо state з DOM
    rebuildStateFromDom();

    // без syncDomFromState — DOM уже у правильному порядку
    normalizeAllRows(root);
    reflowAllRows(root);

    markSectionsDraggable();
  });

  scope.addEventListener('dragend', () => {
    if (draggingSection) {
      draggingSection.classList.remove('is-dragging-sec');
    }
    draggingSection = null;
  });
}





// ---------- handles ----------





















function ensureAllHandles(scope) {
  const dirs = ['n','s','w','e','nw','ne','sw','se'];
  scope.querySelectorAll('.st-block').forEach(block => {
    const existing = new Set(
      [...block.querySelectorAll('.st-resize')].map(h => h.dataset.dir)
    );
    dirs.forEach(d => {
      if (existing.has(d)) return;
      const h = document.createElement('div');
      h.className = `st-resize st-resize--${d}`;
      h.dataset.dir = d;
      block.appendChild(h);
    });
  });
}








// ---------- normalize old widths -> fr ----------
function normalizeAllRows(scope) {
  scope.querySelectorAll('.st-row').forEach(row => {
    const blocks = [...row.querySelectorAll(':scope > .st-block')];
    if (!blocks.length) return;

    const rowW = row.getBoundingClientRect().width || 1;
    const px   = blocks.map(b => parseFloat(b.style.width || 0));
    const hasPx = px.some(v => v > 0);

    let frs;

    if (hasPx) {
      // Є явні px-ширини — конвертуємо їх у частки (fr)
      frs = px.map(v => v > 0 ? (v / rowW) : null);
      const fixedSum  = frs.reduce((s, v) => s + (v || 0), 0);
      const nullCount = frs.filter(v => v == null).length;
      const remain    = Math.max(0.0001, 1 - fixedSum);
      const each      = nullCount ? remain / nullCount : 0;

      frs = frs.map(v => (v == null ? each : v));
      const sum = frs.reduce((s, v) => s + v, 0) || 1;
      frs = frs.map(v => v / sum);
    } else {
      // Немає px → пробуємо використати існуючі data-fr
      const dataFrs = blocks.map(b => parseFloat(b.dataset.fr || ''));
      const hasValidData = dataFrs.every(v => Number.isFinite(v) && v > 0);

      if (hasValidData) {
        // Є валідні fr — просто нормалізуємо, щоб сума = 1
        const sum = dataFrs.reduce((s, v) => s + v, 0) || 1;
        frs = dataFrs.map(v => v / sum);
      } else {
        // Взагалі нічого немає → ставимо всім рівні частки (початковий стан)
        const eq = 1 / blocks.length;
        frs = blocks.map(() => eq);
      }
    }

    // Застосовуємо fr-и до блоків
    blocks.forEach((b, i) => {
      b.dataset.fr = String(frs[i]);
      b.style.width = ''; // ширину контролює applyFrs через fr
    });
    applyFrs(row, frs);
  });
}


// ---------- Active select ----------
// ---------- Active select ----------
function initActiveSelect(scope) {
  scope.addEventListener('click', (e) => {
    const isMulti = e.ctrlKey || e.metaKey; // Ctrl (Win) / Cmd (Mac)

    const block   = e.target.closest('.st-block');
    const section = e.target.closest('.st-section');
    const el = block || section;

    // Якщо клікнули по блоку / секції
    if (el) {
      if (isMulti) {
        // ---- МУЛЬТИВИБІР: Ctrl+клік → toggle .is-selected ----
        const alreadySelected = el.classList.contains('is-selected');

        if (alreadySelected) {
          el.classList.remove('is-selected');

          // якщо це був активний елемент — оновлюємо activeEl
          if (el.classList.contains('is-active')) {
            el.classList.remove('is-active');
            activeEl = null;

            // зробимо активним якийсь інший виділений (якщо є)
            const lastSel = scope.querySelector(
              '.st-block.is-selected, .st-section.is-selected'
            );
            if (lastSel) {
              setActive(lastSel, { keepSelection: true });
            }
          }
        } else {
          // додаємо до групи
          el.classList.add('is-selected');
          // останній клік робимо активним
          setActive(el, { keepSelection: true });
        }
      } else {
        // ---- ЗВИЧАЙНИЙ КЛІК: один активний і один selected ----
        clearSelection();
        el.classList.add('is-selected');
        setActive(el, { keepSelection: true });
      }

      return;
    }

    // Клік повз — скинути виділення (тільки якщо без Ctrl)
    if (!isMulti) {
      clearSelection();
      setActive(null, { keepSelection: false });
    }
  });

  function clearSelection() {
    root
      .querySelectorAll('.st-block.is-selected, .st-section.is-selected')
      .forEach(node => node.classList.remove('is-selected'));
  }

  function setActive(el, opts = {}) {
    const keepSelection = !!opts.keepSelection;

    // активний завжди один
    root
      .querySelectorAll('.st-block.is-active, .st-section.is-active')
      .forEach(node => node.classList.remove('is-active'));

    activeEl = el;

    if (el) {
      el.classList.add('is-active');

      // якщо не передали keepSelection — гарантуємо, що активний теж в selected
      if (!keepSelection) {
        el.classList.add('is-selected');
      }
    }
  }
}



// ---------- Insert line helpers ----------
function ensureInsertLine(row) {
  if (!insertLine) {
    insertLine = document.createElement('div');
    insertLine.className = 'st-insert-line';
  }
  if (insertLine.parentElement !== row) {
    row.appendChild(insertLine);
  }
}

// ---------- Insert line для секцій ----------
function ensureSecInsertLine(scope) {
  if (!secInsertLine) {
    secInsertLine = document.createElement('div');
    secInsertLine.className = 'st-sec-insert-line';
  }
  if (secInsertLine.parentElement !== scope) {
    scope.appendChild(secInsertLine);
  }
}

function showSecInsert(scope, index) {
  ensureSecInsertLine(scope);

  const sections = [...scope.querySelectorAll(':scope > .st-section')].filter(s => s !== dragSection);
  const rootRect = scope.getBoundingClientRect();

  let y;

  if (!sections.length) {
    // якщо секцій поки нема — лінія зверху
    y = rootRect.top + 8;
  } else if (index <= 0) {
    const r = sections[0].getBoundingClientRect();
    y = r.top;
  } else if (index >= sections.length) {
    const r = sections[sections.length - 1].getBoundingClientRect();
    y = r.bottom;
  } else {
    const prev = sections[index - 1].getBoundingClientRect();
    const next = sections[index].getBoundingClientRect();
    y = (prev.bottom + next.top) / 2;
  }

  secInsertLine.style.top = (y - rootRect.top) + 'px';
  secInsertLine.classList.add('is-visible');
  secInsertInfo = { index };
}

function clearSecInsert() {
  if (secInsertLine) secInsertLine.classList.remove('is-visible');
  secInsertInfo = null;
}















function showInsertLine(row, index) {
  ensureInsertLine(row);

  const blocks = [...row.querySelectorAll(':scope > .st-block')].filter(b => b !== dragEl);
  const rowRect = row.getBoundingClientRect();
  const cs = getComputedStyle(row);

  const orient = row.dataset.layoutOrient || 'row';

  if (orient === 'column') {
    // 🔹 ВЕРТИКАЛЬНИЙ РЯД: показуємо ГОРИЗОНТАЛЬНУ лінію між блоками
    const gap = parseFloat(cs.rowGap || cs.gap || '16') || 16;
    let y;

    if (blocks.length === 0) {
      y = rowRect.top + gap / 2;
    } else if (index <= 0) {
      const firstRect = blocks[0].getBoundingClientRect();
      y = firstRect.top - gap / 2;
    } else if (index >= blocks.length) {
      const lastRect = blocks[blocks.length - 1].getBoundingClientRect();
      y = lastRect.bottom + gap / 2;
    } else {
      const prevRect = blocks[index - 1].getBoundingClientRect();
      const nextRect = blocks[index].getBoundingClientRect();
      y = (prevRect.bottom + nextRect.top) / 2;
    }

    const top = y - rowRect.top;

    insertLine.style.top = `${top}px`;
    insertLine.style.bottom = 'auto';
    insertLine.style.left = '0';
    insertLine.style.width = '100%';
    insertLine.style.height = '2px';
  } else {
    // 🔹 ГОРИЗОНТАЛЬНИЙ РЯД: як і було — вертикальна лінія між колонками
    const gap = parseFloat(cs.columnGap || cs.gap || '16') || 16;
    let x;

    if (blocks.length === 0) {
      x = rowRect.left + gap / 2;
    } else if (index <= 0) {
      const firstRect = blocks[0].getBoundingClientRect();
      x = firstRect.left - gap / 2;
    } else if (index >= blocks.length) {
      const lastRect = blocks[blocks.length - 1].getBoundingClientRect();
      x = lastRect.right + gap / 2;
    } else {
      const prevRect = blocks[index - 1].getBoundingClientRect();
      const nextRect = blocks[index].getBoundingClientRect();
      x = (prevRect.right + nextRect.left) / 2;
    }

    const left = x - rowRect.left;
    insertLine.style.left = `${left}px`;
    insertLine.style.top = '6px';
    insertLine.style.bottom = '6px';
    insertLine.style.width = '2px';
    insertLine.style.height = '';
  }

  insertLine.classList.add('is-visible');
  insertInfo = { row, index };
}


function hideInsertLine() {
  if (insertLine) insertLine.classList.remove('is-visible');
  insertInfo = null;
}

// ---------- DnD ----------
// ---------- DnD ----------
// ---------- DnD ----------
function initDnD(scope) {

  scope.addEventListener('dragstart', (e) => {
    const block = e.target.closest('.st-block');
    if (!block) return;

    dragEl = block;
    setActiveOnly(block);

    block.classList.add('is-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', block.dataset.uid || uid(block));
    }
  });

  scope.addEventListener('dragend', () => cleanupDrag());

  scope.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    e.preventDefault();

    const overBlock = e.target.closest('.st-block');
    const overRow   = e.target.closest('.st-row');

    // Якщо наводимо на сам перетягуваний блок або його нащадка — нічого не показуємо
    if (overBlock && (overBlock === dragEl || dragEl.contains(overBlock))) {
      clearDropVisuals();
      return;
    }

    // ----- КУРСОР НАД БЛОКОМ -----
if (overBlock) {
  const row = overBlock.closest('.st-row');

  // Якщо взагалі немає рядка — нічого не робимо
  if (!row) {
    setDropTarget(null);
    hideInsertLine();
    return;
  }

  const orient = row.dataset.layoutOrient || 'row';
  const blocks = [...row.querySelectorAll(':scope > .st-block')].filter(b => b !== dragEl);
  const isLine = overBlock.dataset.blockKind === 'line';

  // 🔹 1) ЛІНІЯ НІКОЛИ НЕ Є КОНТЕЙНЕРОМ
  // Якщо ми наводимо/дропаємось на ЛІНІЮ — трактуємо це як вставку ПЕРЕД/ПІСЛЯ неї в РЯДУ,
  // але НІКОЛИ не робимо вкладення в середину лінії.
  if (isLine) {
    const rect = overBlock.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Знаходимо позицію лінії серед інших блоків
    let idx = blocks.indexOf(overBlock);
    if (idx === -1) {
      idx = blocks.length;
    }

    let insertIndex = idx;

    if (orient === 'column') {
      // Вертикальний ряд: дивимось по Y
      const centerY = rect.top + rect.height / 2;
      const before = y < centerY;
      insertIndex = before ? idx : idx + 1;
    } else {
      // Горизонтальний ряд: дивимось по X
      const centerX = rect.left + rect.width / 2;
      const before = x < centerX;
      insertIndex = before ? idx : idx + 1;
    }

    setDropTarget(row);
    showInsertLine(row, insertIndex);
    return;
  }

  // 🔹 2) Особливий випадок: у рядку тільки один НЕ-лінійний блок
  // (ця логіка лишається, як ми робили раніше — з зонами до/після)
  if (blocks.length === 1 && blocks[0] === overBlock) {
    const rect   = overBlock.getBoundingClientRect();

    if (orient === 'column') {
      // Вертикальний ряд: зони "над" і "під"
      const y        = e.clientY;
      const topZone  = rect.top + rect.height * 0.25;
      const botZone  = rect.bottom - rect.height * 0.25;

      // 🔼 ПЕРЕД (над) єдиним блоком
      if (y < topZone) {
        setDropTarget(row);
        showInsertLine(row, 0);
        return;
      }

      // 🔽 ПІСЛЯ (під) єдиним блоком
      if (y > botZone) {
        setDropTarget(row);
        showInsertLine(row, blocks.length); // 1 — після
        return;
      }
    } else {
      // Горизонтальний ряд: зони "зліва" і "справа"
      const x        = e.clientX;
      const leftZone = rect.left + rect.width * 0.25;
      const rightZone = rect.right - rect.width * 0.25;

      // 👈 ПЕРЕД єдиним блоком
      if (x < leftZone) {
        setDropTarget(row);
        showInsertLine(row, 0);
        return;
      }

      // 👉 ПІСЛЯ єдиного блока
      if (x > rightZone) {
        setDropTarget(row);
        showInsertLine(row, blocks.length); // 1 — після
        return;
      }
    }

    // Якщо в середині — далі працюємо як "вкладення в блок"
  }

  // 🔹 3) Звичайний блок (НЕ лінія) — стандартна логіка:
  // drop на блок = вкладення в блок (без лінії)
  setDropTarget(overBlock);
  hideInsertLine();
  return;
}


    // ----- КУРСОР НАД РЯДКОМ (МІЖ БЛОКАМИ) -----
    if (overRow) {
      setDropTarget(overRow);

      const idx = calcInsertIndex(overRow, e.clientX, e.clientY);
      if (!insertInfo || insertInfo.row !== overRow || insertInfo.index !== idx) {
        showInsertLine(overRow, idx);
      }
      return;
    }

    // поза блоками/рядками — прибираємо підсвітку
    clearDropVisuals();
  });

  scope.addEventListener('drop', (e) => {
    if (!dragEl) return;
    e.preventDefault();

    // 🔹 1) Якщо є активна "лінія вставки" — це головний сценарій:
    // завжди трактуємо drop як перестановку в ряд.
      if (insertInfo && insertInfo.row) {
    const row = insertInfo.row;
    const dragId = uid(dragEl);

    // 🔹 знайти старий батьківський ряд у state
    const oldParentRow = findParentRowOfBlock(dragId);

    const blocks = [...row.querySelectorAll(':scope > .st-block')].filter(b => b !== dragEl);

    const ref = blocks[insertInfo.index] || null;
    row.insertBefore(dragEl, ref);

    const rowId    = uid(row);
    const rowState = ensureRow(rowId);

    // оновлюємо children нового ряду по фактичному DOM
    rowState.children = [...row.querySelectorAll(':scope > .st-block')].map(b => uid(b));

    // 🔹 якщо блок прийшов з ІНШОГО рядка — прибираємо його id зі старого
    if (oldParentRow && oldParentRow.id !== rowId) {
      oldParentRow.children = (oldParentRow.children || []).filter(id => id !== dragId);
    }

    cleanupAfterDrop();
    return;
  }

    // 🔹 2) Якщо лінії немає — drop на блок = ВКЛАДЕННЯ
    const targetBlock = e.target.closest('.st-block');

    if (targetBlock && targetBlock !== dragEl && !dragEl.contains(targetBlock)) {
      let innerRow = targetBlock.querySelector(':scope > .st-row');
      if (!innerRow) {
        innerRow = document.createElement('div');
        innerRow.className = 'st-row';
        innerRow.dataset.type = 'container';
        innerRow.style.gridTemplateColumns = 'repeat(1, minmax(0,1fr))';
        targetBlock.appendChild(innerRow);
      }

      const dragId   = uid(dragEl);
      const targetId = uid(targetBlock);

      nestBlock(targetId, dragId);
      syncDomFromState();
      cleanupAfterDrop();
      return;
    }

    // 🔹 3) Ні лінії, ні блока-цілі — просто чистимо стан
    cleanupAfterDrop();
  });

 function calcInsertIndex(row, x, y) {
  const blocks = [...row.querySelectorAll(':scope > .st-block')].filter(b => b !== dragEl);
  if (!blocks.length) return 0;

  const orient = row.dataset.layoutOrient || 'row';

  if (orient === 'column') {
    // Вертикальний ряд: дивимось по Y — вище / нижче центру блока
    for (let i = 0; i < blocks.length; i++) {
      const r = blocks[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return blocks.length;
  }

  // Горизонтальний ряд: як було — по X
  for (let i = 0; i < blocks.length; i++) {
    const r = blocks[i].getBoundingClientRect();
    if (x < r.left + r.width / 2) return i;
  }
  return blocks.length;
}


  function setDropTarget(el) {
    if (dropTarget && dropTarget !== el) dropTarget.classList.remove('is-drop-target');
    dropTarget = el;
    if (dropTarget) dropTarget.classList.add('is-drop-target');
  }

  function setActiveOnly(block){
    const prev = scope.querySelector('.st-block.is-active');
    if (prev && prev !== block) prev.classList.remove('is-active');
    block.classList.add('is-active');
  }

  function clearDropVisuals() {
    if (dropTarget) dropTarget.classList.remove('is-drop-target');
    dropTarget = null;
    hideInsertLine();
  }

  function cleanupAfterDrop() {
    cleanupDrag();
    normalizeAllRows(root);
    reflowAllRows(root);
  }

  function cleanupDrag() {
    if (dragEl) dragEl.classList.remove('is-dragging');
    if (dropTarget) dropTarget.classList.remove('is-drop-target');
    dragEl = null;
    dropTarget = null;
    hideInsertLine();
  }
}
















// ---------- DnD секцій (root-level) ----------
function initSectionDnD(scope) {
  // dragstart для секцій
  scope.addEventListener('dragstart', (e) => {
    const sec = e.target.closest('.st-section');
    const block = e.target.closest('.st-block');

    // Якщо клікнули по блоку всередині секції — це DnD блоків, а не секції
    if (!sec || block) return;
    if (sec.parentElement !== scope) return; // тільки root-секції

    dragSection = sec;
    dragSection.classList.add('is-dragging');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'section');
    }
  });

  // dragover — показуємо горизонтальну лінію між секціями
  scope.addEventListener('dragover', (e) => {
    if (!dragSection) return;
    e.preventDefault();

    const overSec = e.target.closest('.st-section');
    if (!overSec || overSec === dragSection || overSec.parentElement !== scope) {
      clearSecInsert();
      return;
    }

    const sections = [...scope.querySelectorAll(':scope > .st-section')].filter(s => s !== dragSection);
    const idx = sections.indexOf(overSec);
    if (idx === -1) {
      clearSecInsert();
      return;
    }

    const rect = overSec.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    let targetIndex;
    if (e.clientY < midY) {
      targetIndex = idx;       // вставити ПЕРЕД overSec
    } else {
      targetIndex = idx + 1;   // вставити ПІСЛЯ overSec
    }

    showSecInsert(scope, targetIndex);
  });

  // drop — міняємо DOM-ордер секцій і оновлюємо siteState.page.rootRows
  scope.addEventListener('drop', (e) => {
    if (!dragSection) return;
    e.preventDefault();

    const allSections = [...scope.querySelectorAll(':scope > .st-section')].filter(s => s !== dragSection);

    let index = allSections.length;
    if (secInsertInfo && typeof secInsertInfo.index === 'number') {
      index = Math.max(0, Math.min(allSections.length, secInsertInfo.index));
    }

    const ref = allSections[index] || null;
    scope.insertBefore(dragSection, ref);

    // Оновлюємо порядок rootRows у state по фактичному DOM
    const orderedRows = [...scope.querySelectorAll(':scope > .st-section > .st-row')]
      .map(r => r.dataset.uid)
      .filter(Boolean);

    siteState.page.rootRows = orderedRows;

    dragSection.classList.remove('is-dragging');
    dragSection = null;
    clearSecInsert();

    // перебудовуємо DOM зі state, щоб усе було синхронно
    syncDomFromState();
  });

  scope.addEventListener('dragend', () => {
    if (!dragSection) return;
    dragSection.classList.remove('is-dragging');
    dragSection = null;
    clearSecInsert();
  });
}










// ---------- Resize (FR-based) ----------
// ---------- Resize (FR-based + safe vertical for children) ----------
function initResize(scope) {
  let active = null;

  scope.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.st-resize');
    if (!handle) return;

    const block = handle.closest('.st-block');
    const row   = block.parentElement.closest('.st-row');
    if (!block || !row) return;

    e.preventDefault();
    block.setPointerCapture(e.pointerId);

    const dir = handle.dataset.dir;
    const rowRect  = row.getBoundingClientRect();
    const startFrs = readFrs(row);

    // Поточна висота блока
    const blockRect = block.getBoundingClientRect();
    const startH    = blockRect.height;

    // ---- Рахуємо “безпечний” мінімум по дітях ----
    const intrinsicMin = getChildMinSize(block).minH || 0;

    let contentH = 0;
    const innerRow = block.querySelector(':scope > .st-row');
    if (innerRow) {
      // якщо це контейнер — беремо реальну висоту внутрішнього ряду
      const r = innerRow.getBoundingClientRect();
      contentH = r.height;
    } else {
      // листковий блок — беремо висоту контенту всередині
      const innerContent = block.firstElementChild;
      if (innerContent) {
        const c = innerContent.getBoundingClientRect();
        contentH = c.height;
      } else {
        contentH = startH;
      }
    }

    const baseMin = 80;
    const safeMinH = Math.max(baseMin, intrinsicMin, contentH);

    active = {
      block,
      row,
      dir,
      rowW: rowRect.width,
      startX: e.clientX,
      startY: e.clientY,
      startFrs,
      startH,
      minH: safeMinH   // ⬅ мінімум, нижче якого блок не падає при ресайзі
    };
  });

  scope.addEventListener('pointermove', (e) => {
    if (!active) return;

    const dx = e.clientX - active.startX;
    const dy = e.clientY - active.startY;

    // Горизонтальний ресайз (ширина блоків)
    if (['e','w','ne','nw','se','sw'].includes(active.dir)) {
      const blocks = [...active.row.querySelectorAll(':scope > .st-block')];
      const i = blocks.indexOf(active.block);

      if (i !== -1) {
        const startFr = active.startFrs[i] ?? (1 / blocks.length);

        // Для лівих хендлів (w / nw / sw) інвертуємо знак,
        // щоб відчуття руху було таким самим, як у правих
        const sign = ['w','nw','sw'].includes(active.dir) ? -1 : 1;
        const deltaFr = sign * dx / Math.max(1, active.rowW);

        // Мінімальні ширини: базова + від дітей (щоб діти не вилазили за батька)
        const minFrs = blocks.map(b => {
          const minWpx    = getChildMinSize(b).minW;              // px
          const frByChild = minWpx / Math.max(1, active.rowW);    // -> fr
          return Math.max(0.08, frByChild);                       // 0.08 — базовий мінімум
        });

        const minHere      = minFrs[i];
        const minOthersSum = minFrs.reduce((s, v, idx) => idx === i ? s : s + v, 0);

        // Нове fr цього блока: не менше мінімалки і не більше так, щоб інші не впали нижче свого мінімуму
        let newFr = clamp(startFr + deltaFr, minHere, 1 - minOthersSum);

        const othersIdx = blocks.map((_, k) => k).filter(k => k !== i);
        const remain    = 1 - newFr;

        const frs = active.startFrs.slice();
        frs[i] = newFr;

        // Спочатку даємо іншим їх мінімум, а залишок — пропорційно стартовим "вільним" часткам
        const minsForOthers = othersIdx.map(k => minFrs[k]);
        const minSum        = minsForOthers.reduce((s, v) => s + v, 0);
        let freeRemain      = Math.max(0, remain - minSum);

        const weights = othersIdx.map(k =>
          Math.max(0, (active.startFrs[k] || 0) - minFrs[k])
        );
        const wSum = weights.reduce((s, v) => s + v, 0);

        othersIdx.forEach((k, idx) => {
          const base = minFrs[k];
          const add  = wSum > 0
            ? freeRemain * (weights[idx] / wSum)
            : (othersIdx.length ? freeRemain / othersIdx.length : 0);
          frs[k] = base + add;
        });

        // Нормалізація (похибки)
        const sum = frs.reduce((s, v) => s + v, 0) || 1;
        for (let k = 0; k < frs.length; k++) {
          frs[k] = frs[k] / sum;
          blocks[k].dataset.fr = String(frs[k]);
          blocks[k].style.width = '';
        }

        applyFrs(active.row, frs);

        // Синхронізуємо ширини з state, щоб при syncDomFromState вони не скидались
        const rowId = active.row.dataset.uid;
        if (rowId) {
          const rowState = ensureRow(rowId);
          rowState.columns = frs.slice();
        }
      }
    }

    // Вертикальний ресайз (висота блока)
    // Вертикальний ресайз (висота блока)
  if (['n','s','ne','nw','se','sw'].includes(active.dir)) {
    const minH = active.minH || 80; // тепер це реальна висота контенту + базовий мінімум
    const newH = clamp(active.startH + dy, minH, 5000);
    active.block.style.height = newH + 'px';
  }

  // -------- AUTO-GROW PARENT (з урахуванням стандартного нижнього відступу) --------
  let parentBlock = active.block.parentElement.closest('.st-block');
  if (parentBlock) {
    const parentRect = parentBlock.getBoundingClientRect();
    const childRect  = active.block.getBoundingClientRect();

    const extraGap = 9; // наш стандартний нижній відступ

    const overflow = childRect.bottom + extraGap - parentRect.bottom;

    if (overflow > 0) {
      const newParentH = parentRect.height + overflow;
      parentBlock.style.height = newParentH + 'px';

      const pid = parentBlock.dataset.uid;
      if (pid && siteState.blocks && siteState.blocks[pid]) {
        siteState.blocks[pid].height = newParentH;
      }
    }
    }

  });

  scope.addEventListener('pointerup', () => {
    if (!active) return;

    // Синхронізуємо висоту з state, щоб після syncDomFromState вона не губилась
    const blockId = active.block.dataset.uid;
    if (blockId && siteState.blocks && siteState.blocks[blockId]) {
      const h = parseFloat(active.block.style.height || '');
      siteState.blocks[blockId].height = Number.isFinite(h) ? h : null;
    }

    active = null;
    reflowAllRows(root);
  });
}


// ---------- Section Resize (min-height) ----------
// ---------- Section Resize (min-height by bottom edge) ----------
// ---------- Section Resize (min-height by bottom edge + cursor) ----------
function initSectionResize(scope) {
  let active = null;
  const edgeZone = 6; // зона в пікселях від нижнього краю секції, де "ловимо" ресайз

  scope.addEventListener('pointerdown', (e) => {
    // шукаємо секцію, по якій клікнули
    const section = e.target.closest('.st-section');
    if (!section || !scope.contains(section)) return;

    const rect = section.getBoundingClientRect();

    // якщо клік НЕ біля нижнього краю — нічого не робимо
    if (Math.abs(e.clientY - rect.bottom) > edgeZone) return;

    // це "хватка" за нижній край секції
    e.preventDefault();
    e.stopPropagation(); // не даємо цьому кліку виділити секцію/блок

    section.setPointerCapture(e.pointerId);

    const row = section.querySelector(':scope > .st-row');
    const contentRect = row ? row.getBoundingClientRect() : rect;

    const startMin = parseFloat(section.style.minHeight || '');
    const initialMin = Number.isFinite(startMin) ? startMin : rect.height;

    active = {
      section,
      pointerId: e.pointerId,
      startY: e.clientY,
      startMin: initialMin,
      contentMin: contentRect.height // секція не стане нижчою за контент
    };

    // під час тягнення курсор — як у хендла блока
    scope.style.cursor = 'ns-resize';
  });

  scope.addEventListener('pointermove', (e) => {
    // якщо зараз не тягнемо — тільки керуємо курсором при наведенні
    if (!active) {
      const section = e.target.closest('.st-section');
      if (!section || !scope.contains(section)) {
        scope.style.cursor = '';
        return;
      }

      const rect = section.getBoundingClientRect();
      if (Math.abs(e.clientY - rect.bottom) <= edgeZone) {
        scope.style.cursor = 'ns-resize';
      } else {
        scope.style.cursor = '';
      }
      return;
    }

    // якщо тягнемо — міняємо min-height секції
    const dy = e.clientY - active.startY;
    let wanted = active.startMin + dy;

    const minH = Math.max(active.contentMin, 120); // мінімум для секції
    const newH = clamp(wanted, minH, 5000);

    active.section.style.minHeight = newH + 'px';
  });

  scope.addEventListener('pointerup', (e) => {
    if (!active) return;
    try {
      active.section.releasePointerCapture(active.pointerId);
    } catch (_) {}
    active = null;
    scope.style.cursor = '';
  });

  scope.addEventListener('pointerleave', () => {
    // якщо не тягнемо — прибираємо спецкурсор при виході миші з полотна
    if (!active) {
      scope.style.cursor = '';
    }
  });
}












// ---------- FR helpers ----------
function readFrs(row) {
  const blocks = [...row.querySelectorAll(':scope > .st-block')];
  const stored = blocks.map(b => parseFloat(b.dataset.fr || ''));
  if (stored.every(n => Number.isFinite(n))) return stored;

  const eq = 1 / Math.max(1, blocks.length);
  const frs = blocks.map(()=>eq);
  blocks.forEach((b,i)=> b.dataset.fr = String(frs[i]));
  return frs;
}

function applyFrs(row, frs) {
  // Якщо ряд у вертикальному режимі — завжди одна колонка.
  // DnD не повинен перетворювати його назад у "горизонтальний".
  const orient = row.dataset.layoutOrient || 'row';

  if (orient === 'column') {
    row.style.gridTemplateColumns = '1fr';
    return;
  }

  // Горизонтальний режим — стандартна логіка fr-ширин
  row.style.gridTemplateColumns = frs.map(f => `${f.toFixed(4)}fr`).join(' ');
}




// ---------- Мін.розміри по дітях ----------
// ✅ Інтринсік мінімум блока (не залежить від поточної ширини)
function getIntrinsicMinSize(block){
  const innerRow = block.querySelector(':scope > .st-row');
  if (!innerRow) {
    const cs = getComputedStyle(block);
    const mw = parseFloat(cs.minWidth)  || 120;
    const mh = parseFloat(cs.minHeight) || 80;
    return { minW: Math.max(120, mw), minH: Math.max(80, mh) };
  }

  const kids = [...innerRow.querySelectorAll(':scope > .st-block')];
  if (!kids.length) return { minW: 120, minH: 80 };

  const rowCS = getComputedStyle(innerRow);
  const gap =
    parseFloat(rowCS.columnGap) ||
    parseFloat(rowCS.gap) ||
    0;

  // сумарний мінімум по ширині = сума мінімумів дітей + gap-и між ними
  const kidsMin = kids.map(k => getIntrinsicMinSize(k));
  const minWKids = kidsMin.reduce((s, v) => s + v.minW, 0);
  const minHKids = Math.max(...kidsMin.map(v => v.minH));

  const minW = minWKids + gap * (kids.length - 1) + 24; // + padding як було
  const minH = minHKids + 24;

  return {
    minW: Math.max(120, minW),
    minH: Math.max(80, minH)
  };
}

// ✅ стара назва лишається для сумісності (інші місця її викликають)
// ---------- Мін.розміри по дітях ----------
// ✅ Інтринсік мінімум: не залежить від поточної ширини/висоти DOM
function getChildMinSize(block) {
  const innerRow = block.querySelector(':scope > .st-row');

  // Листковий блок
  if (!innerRow) {
    const cs = getComputedStyle(block);
    const mw = parseFloat(cs.minWidth)  || 120;
    const mh = parseFloat(cs.minHeight) || 80;
    return { minW: Math.max(120, mw), minH: Math.max(80, mh) };
  }

  const kids = [...innerRow.querySelectorAll(':scope > .st-block')];
  if (!kids.length) return { minW: 120, minH: 80 };

  const rowCS = getComputedStyle(innerRow);
  const gap =
    parseFloat(rowCS.columnGap) ||
    parseFloat(rowCS.gap) ||
    0;

  // Сума мінімумів дітей + gap-и
  let sumW = 0;
  let maxH = 0;
  kids.forEach(k => {
    const m = getChildMinSize(k);  // рекурсія
    sumW += m.minW;
    if (m.minH > maxH) maxH = m.minH;
  });

  const minW = sumW + gap * (kids.length - 1) + 24; // + padding як було
  const minH = maxH + 24;

  return {
    minW: Math.max(120, minW),
    minH: Math.max(80, minH)
  };
}

// ---------- Helpers для секцій ----------

// отримати секцію зі state
function getSectionState(id) {
  const sections = siteState.sections || {};
  return sections[id] || null;
}

// чи ancestorId є предком childId (щоб не допустити циклів)
function isSectionAncestor(ancestorId, childId) {
  const sections = siteState.sections || {};
  let cur = sections[childId];

  while (cur && cur.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = sections[cur.parentId];
  }
  return false;
}

// відкріпити секцію від її поточного батька (або root)
function detachSectionFromParent(secId) {
  const sections = siteState.sections || {};
  const sec = sections[secId];
  if (!sec) return;

  const oldParentId = sec.parentId;
  if (oldParentId && sections[oldParentId]) {
    // видаляємо з children батька
    sections[oldParentId].children = (sections[oldParentId].children || []).filter(id => id !== secId);
  } else {
    // це була root-секція — видаляємо з rootSections
    const roots = siteState.page.rootSections || [];
    siteState.page.rootSections = roots.filter(id => id !== secId);
  }
}

// прикріпити секцію до нового батька (або зробити root)
function attachSectionToParent(secId, newParentId) {
  const sections = siteState.sections || {};
  const sec = sections[secId];
  if (!sec) return;

  sec.parentId = newParentId || null;

  if (newParentId && sections[newParentId]) {
    const parent = sections[newParentId];
    parent.children = parent.children || [];
    if (!parent.children.includes(secId)) {
      parent.children.push(secId);
    }
  } else {
    // робимо секцію root
    const roots = siteState.page.rootSections || [];
    if (!roots.includes(secId)) roots.push(secId);
    siteState.page.rootSections = roots;
  }
}

// змінити батька секції з перевіркою на рекурсію
function reparentSection(secId, newParentId) {
  const sections = siteState.sections || {};
  if (!sections[secId]) return;

  // не дозволяємо зробити батьком саму себе
  if (newParentId === secId) return;

  // не дозволяємо зробити нащадка батьком (цикл)
  if (newParentId && isSectionAncestor(secId, newParentId)) return;

  detachSectionFromParent(secId);
  attachSectionToParent(secId, newParentId);
}








// ---------- Reflow ----------
// ---------- Reflow ----------
function reflowAllRows(scope) {
  // 1) ШИРИНИ (fr): зберігаємо поточні data-fr / читаємо рівні частки
  scope.querySelectorAll('.st-row').forEach(row => {
    const frs = readFrs(row);
    applyFrs(row, frs);
  });

  // 2) ВИСОТИ блоків: НІКОЛИ не зменшуємо вручну виставлену висоту
  const blocks = scope.querySelectorAll('.st-block');
  blocks.forEach(block => {
    const currentH = parseFloat(block.style.height || '');
    const hasExplicitHeight = Number.isFinite(currentH);

    const childMin = getChildMinSize(block).minH || 0;
    const baseMin  = 80; // твій мінімум з ресайзу

    if (!hasExplicitHeight) {
      const target = Math.max(childMin, baseMin);
      if (target > 0) block.style.height = target + 'px';
      return;
    }

    const target = Math.max(currentH, childMin, baseMin);
    block.style.height = target + 'px';
  });
}

function bindReflowOnResize(scope) {
  const ro = new ResizeObserver(() => reflowAllRows(scope));
  const siteCanvas = document.getElementById('site-canvas');
  if (siteCanvas) ro.observe(siteCanvas);
  window.addEventListener('resize', () => reflowAllRows(scope));
}







// ---------- Nesting state ----------
function findParentRowOfBlock(blockId){
  for (const rid in siteState.rows){
    const r = siteState.rows[rid];
    if (r.children && r.children.includes(blockId)) return r;
  }
  return null;
}

function nestBlock(targetBlockId, dragBlockId){
  // remove from old parent row
  const parentRow = findParentRowOfBlock(dragBlockId);
  if (parentRow){
    parentRow.children = parentRow.children.filter(id => id !== dragBlockId);
  }

  const targetBlock = ensureBlock(targetBlockId);

  // ensure inner row
  if (!targetBlock.childrenRow){
    const newRowId = 'r_' + Math.random().toString(36).slice(2,9);
    targetBlock.type = "block-container";
    targetBlock.childrenRow = newRowId;
    ensureRow(newRowId);
  }

  const innerRow = ensureRow(targetBlock.childrenRow);
  innerRow.children = innerRow.children || [];
  innerRow.children.push(dragBlockId);

  // normalize columns
  innerRow.columns = innerRow.columns || [];
  const n = innerRow.children.length;
  innerRow.columns = innerRow.children.map(()=>1/n);
}

// ---------- Sync DOM from state ----------
// ---------- Sync DOM from state (rows + секції) ----------
function syncDomFromState() {
  // гарантуємо структуру state
  siteState.page     = siteState.page     || {};
  siteState.sections = siteState.sections || {};

  const rootRowIds = Array.isArray(siteState.page.rootRows)
    ? siteState.page.rootRows.slice()
    : [];

  const rootSecIds = [];

  // 1) Гарантуємо, що для кожного root-row є rowEl + секція навколо нього
  const rowEls = rootRowIds.map((rid) => {
    let rowEl = root.querySelector(`.st-row[data-uid="${rid}"]`);
    let secEl;

    if (!rowEl) {
      // ряду ще нема в DOM — створюємо
      rowEl = createRowEl(rid);
      secEl = ensureSection(rowEl);       // обгортаємо в <section>
      root.appendChild(secEl);
    } else {
      // ряд існує — шукаємо його секцію
      secEl = rowEl.closest('.st-section');
      if (!secEl || secEl.parentElement !== root) {
        // якщо секція “глибше” або її немає — робимо нормальну root-секцію
        secEl = ensureSection(rowEl);
        if (secEl.parentElement !== root) {
          root.appendChild(secEl);
        }
      }
    }

    // 2) Стабільний secId для секції
    let secId = secEl.dataset.secId;
    if (!secId) {
      secId = 's_' + Math.random().toString(36).slice(2, 9);
      secEl.dataset.secId = secId;
    }
    rootSecIds.push(secId);

    // 3) Оновлюємо/створюємо запис секції в state
    let secState = siteState.sections[secId] || {
      id: secId,
      rowId: rid,
      parentId: null,
      children: []
    };

    secState.rowId    = rid;
    secState.parentId = secState.parentId ?? null;
    secState.children = secState.children || [];

    siteState.sections[secId] = secState;

    return rowEl;
  });

  // root-секції тепер явно фіксуємо в state
  siteState.page.rootSections = rootSecIds;

  // 4) Прибираємо зайві секції, яких немає в state.page.rootRows
  [...root.querySelectorAll(':scope > .st-section')].forEach(sec => {
    const row = sec.querySelector(':scope > .st-row');
    if (!row) {
      sec.remove();
      return;
    }
    const rid = row.dataset.uid;
    if (!rootRowIds.includes(rid)) {
      sec.remove();
    }
  });

  // 5) Рендеримо кожен root-row як і раніше
  rowEls.forEach(rowEl => {
    const rid = rowEl.dataset.uid;
    renderRow(rowEl, ensureRow(rid));
  });

  // 6) Прибираємо пусті ряди, оновлюємо DnD/handles/resize
  removeEmptyRows(root);
  ensureDraggable(root);
  ensureSectionDraggable(root);  // ← ми вже додавали цю функцію раніше
  ensureAllHandles(root);
  normalizeAllRows(root);
  reflowAllRows(root);
}


function renderRow(rowEl, rowState){
  const domBlocksById = {};
  [...rowEl.querySelectorAll(':scope > .st-block')].forEach(b=>{
    domBlocksById[uid(b)] = b; // uid тепер СТАБІЛЬНИЙ
  });

  rowEl.innerHTML = '';

  rowState.children = rowState.children || [];
  rowState.children.forEach((bid, i)=>{
    let el = domBlocksById[bid] || root.querySelector(`.st-block[data-uid="${bid}"]`);
    if (!el) el = createBlockEl(bid);
    rowEl.appendChild(el);

    const bState = ensureBlock(bid);
    renderBlock(el, bState);
  });

  // apply frs
  const n = rowState.children.length || 1;
  if (!rowState.columns || rowState.columns.length !== n){
    rowState.columns = rowState.children.map(()=>1/n);
  }
  applyFrs(rowEl, rowState.columns);

  // store fr on blocks
  [...rowEl.querySelectorAll(':scope > .st-block')].forEach((b,i)=>{
    b.dataset.fr = String(rowState.columns[i]);
  });
}

function renderBlock(blockEl, bState){
  // 🔹 тип / вид блока
  const isLine = bState && bState.kind === 'line';

  // базовий клас для всіх
  blockEl.classList.add('st-block');

  // лінія чи звичайний блок
  blockEl.classList.toggle('st-block--line', !!isLine);

  if (isLine) {
    blockEl.dataset.blockKind = 'line';
    const orient = bState.lineOrientation === 'vertical' ? 'vertical' : 'horizontal';
    blockEl.setAttribute('data-line-orientation', orient);
  } else {
    if (blockEl.dataset.blockKind === 'line') {
      delete blockEl.dataset.blockKind;
    }
    blockEl.removeAttribute('data-line-orientation');
  }

  // height
  if (bState.height != null) blockEl.style.height = bState.height + 'px';
  else blockEl.style.height = '';

  // inner row
  if (bState.type === "block-container" && bState.childrenRow){
    let inner = blockEl.querySelector(':scope > .st-row');
    if (!inner){
      inner = createRowEl(bState.childrenRow);
      inner.dataset.type = 'container';
      blockEl.appendChild(inner);
    } else {
      inner.dataset.uid = bState.childrenRow;
    }
    renderRow(inner, ensureRow(bState.childrenRow));
  } else {
    const inner = blockEl.querySelector(':scope > .st-row');
    if (inner) inner.remove();
  }
}


// ---------- helpers to create dom ----------
function createRowEl(id){
  const row = document.createElement('div');
  row.className = 'st-row';
  row.dataset.uid = id;
  return row;
}

function createBlockEl(id){
  const bState = ensureBlock(id);
  const el = document.createElement('div');

  // базові класи та атрибути
  el.className = 'st-block';
  el.dataset.uid = id;
  el.setAttribute('draggable','true');

  // якщо це лінія — застосовуємо спеціальний вигляд
  if (bState.kind === 'line') {
    el.classList.add('st-block--line');
    el.dataset.blockKind = 'line';
    const orient = bState.lineOrientation === 'vertical' ? 'vertical' : 'horizontal';
    el.setAttribute('data-line-orientation', orient);
  }

  return el;
}


function ensureSection(rowEl){
  if (rowEl.closest('.st-section')) return rowEl.closest('.st-section');
  const sec = document.createElement('section');
  sec.className = 'st-section';
  sec.appendChild(rowEl);
  return sec;
}

function removeEmptyRows(scope){
  scope.querySelectorAll('.st-row').forEach(row=>{
    const hasBlocks = row.querySelector(':scope > .st-block');
    if (hasBlocks) return;

    // ✅ Якщо ряд вкладений всередині блока-контейнера — НЕ чіпаємо секцію.
    const hostBlock = row.parentElement && row.parentElement.classList.contains('st-block')
      ? row.parentElement
      : null;

    if (hostBlock){
      // прибираємо тільки цей внутрішній ряд
      const bid = hostBlock.dataset.uid;
      const rid = row.dataset.uid;

      // якщо в стейті цей блок контейнер і його row пустий — скидаємо контейнерність
      const bState = bid && siteState.blocks && siteState.blocks[bid];
      if (bState && bState.childrenRow === rid){
        bState.childrenRow = null;
        bState.type = 'block';
      }

      row.remove();
      return;
    }

    // ✅ Це root-ряд (зверху) — тоді можна прибрати секцію як і було
    const sec = row.closest('.st-section');
    if (sec) sec.remove();
    else row.remove();
  });
}

// ---------- Public helpers for інших модулів / кнопок ----------

// Створити нову секцію з N блоків (по замовчуванні 3)
function addSectionWithBlocks(blockCount = 3) {
  const count = Math.max(1, blockCount | 0);

  const rowId = 'r_' + Math.random().toString(36).slice(2, 9);
  const row = ensureRow(rowId);
  row.children = [];
  row.columns = [];

  for (let i = 0; i < count; i++) {
    const bid = 'b_' + Math.random().toString(36).slice(2, 9);
    const b = ensureBlock(bid);
    b.type = 'block';
    b.childrenRow = null;
    b.height = null;
    row.children.push(bid);
  }

  row.columns = row.children.map(() => 1 / row.children.length);

  siteState.page.rootRows = siteState.page.rootRows || [];
  siteState.page.rootRows.push(rowId);

  // важливо — DOM будується зі state
  syncDomFromState();
}

// Створити новий блок у вказаному rowId
function addBlockToRow(rowId) {
  if (!rowId) return;

  const rowState = ensureRow(rowId);
  rowState.children = rowState.children || [];
  rowState.columns  = rowState.columns && rowState.columns.length === rowState.children.length
    ? rowState.columns.slice()
    : rowState.children.map(() => 1 / Math.max(1, rowState.children.length));

  const newBlockId = 'b_' + Math.random().toString(36).slice(2, 9);
  const bState = ensureBlock(newBlockId);
  bState.type        = 'block';
  bState.childrenRow = null;
  bState.height      = null;

  const oldFrs = rowState.columns;
  if (!oldFrs.length) {
    rowState.children.push(newBlockId);
    rowState.columns = [1];
  } else {
    const oldSum = oldFrs.reduce((s, v) => s + v, 0) || 1;

    // новому блоку даємо частку, а інші трохи стискаємо, але зберігаємо їх пропорції
    const newFr  = oldSum / (oldFrs.length + 1);
    const scale  = (oldSum - newFr) / oldSum;

    const newFrs = oldFrs.map(fr => fr * scale);
    rowState.children.push(newBlockId);
    newFrs.push(newFr);

    const sum2 = newFrs.reduce((s, v) => s + v, 0) || 1;
    rowState.columns = newFrs.map(f => f / sum2);
  }

  syncDomFromState();
}

// створює новий blockId;

// виставляє kind: "line" + lineOrientation: "horizontal";

// коректно оновлює rowState.children і rowState.columns;

// потім робить syncDomFromState(), і лінія з’являється в DOM уже “правильною”.



function addLineToRow(rowId) {
  if (!rowId) return;

  const rowState = ensureRow(rowId);
  rowState.children = rowState.children || [];
  rowState.columns  = rowState.columns && rowState.columns.length === rowState.children.length
    ? rowState.columns.slice()
    : rowState.children.map(() => 1 / Math.max(1, rowState.children.length));

  const newBlockId = 'b_' + Math.random().toString(36).slice(2, 9);
  const bState = ensureBlock(newBlockId);

  bState.type            = 'block';
  bState.childrenRow     = null;
  bState.height          = null;
  bState.kind            = 'line';
  bState.lineOrientation = 'horizontal';

  const oldFrs = rowState.columns;

  if (!oldFrs.length) {
    rowState.children.push(newBlockId);
    rowState.columns = [1];
  } else {
    const oldSum = oldFrs.reduce((s, v) => s + v, 0) || 1;

    // новому блоку даємо частку, а інші трохи стискаємо, але зберігаємо їх пропорції
    const newFr  = oldSum / (oldFrs.length + 1);
    const scale  = (oldSum - newFr) / oldSum;

    const newFrs = oldFrs.map(fr => fr * scale);
    rowState.children.push(newBlockId);
    newFrs.push(newFr);

    const sum2 = newFrs.reduce((s, v) => s + v, 0) || 1;
    rowState.columns = newFrs.map(f => f / sum2);
  }

  // синхронізуємо DOM з оновленим state
  syncDomFromState();
}






// Створити блок у активному блоці або активній секції
function addBlockSmart() {
  // 1) Якщо є активний блок — додаємо всередину нього (як контейнер)
  const activeBlockEl = root.querySelector('.st-block.is-active');
  if (activeBlockEl) {
    const bid = activeBlockEl.dataset.uid;
    if (!bid) return;

    const bState = ensureBlock(bid);
    if (!bState.childrenRow) {
      const newRowId = 'r_' + Math.random().toString(36).slice(2, 9);
      bState.type        = 'block-container';
      bState.childrenRow = newRowId;

      const row = ensureRow(newRowId);
      row.children = row.children || [];
      row.columns  = row.columns  || [];
    }

    addBlockToRow(bState.childrenRow);
    return;
  }

  // 2) Якщо нема активного блока — пробуємо активну секцію
  const activeSection = root.querySelector('.st-section.is-active');
  if (activeSection) {
    const rowEl = activeSection.querySelector(':scope > .st-row');
    if (!rowEl) return;
    const rowId = rowEl.dataset.uid;
    if (!rowId) return;

    addBlockToRow(rowId);
    return;
  }

  // 3) Якщо нічого не вибрано — додаємо в останню root-секцію
  const rootRows = siteState.page.rootRows || [];
  if (rootRows.length) {
    const lastRowId = rootRows[rootRows.length - 1];
    addBlockToRow(lastRowId);
    return;
  }

  // 4) Взагалі нічого немає — спочатку створюємо секцію з одним блоком
  addSectionWithBlocks(1);
}










// зробимо доступним глобально для інших модулів / кнопок
if (typeof window !== 'undefined') {
  window.ST_RESCAN_SITE_STATE = rebuildStateFromDom;
  window.ST_ADD_SECTION       = addSectionWithBlocks;
  window.ST_ADD_BLOCK         = addBlockSmart;
}

// Прив'язка кнопки у шапці віджета
// Прив'язка кнопок у шапці віджета
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const btnSec   = document.getElementById('add-section-btn');
    const btnBlock = document.getElementById('add-block-btn');

    if (btnSec) {
      btnSec.addEventListener('click', () => {
        if (typeof window.ST_ADD_SECTION === 'function') {
          window.ST_ADD_SECTION(3); // секція з трьома блоками
        }
      });
    }

    if (btnBlock) {
      btnBlock.addEventListener('click', () => {
        if (typeof window.ST_ADD_BLOCK === 'function') {
          window.ST_ADD_BLOCK();
        }
      });
    }
  });
}












// ---------- Utils ----------


function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// ✅ СТАБІЛЬНИЙ UID: якщо є — не міняємо
function uid(el){
  if (el && el.dataset && el.dataset.uid) return el.dataset.uid;
  const id = 'b_' + Math.random().toString(36).slice(2,9);
  if (el && el.dataset) el.dataset.uid = id;
  return id;
}



// ---------- Ініціалізація кнопок панелі сайту ----------
function createDefaultSection() {
  const siteRoot = document.getElementById('site-root') || document.querySelector('.site-root');
  if (!siteRoot) return;

  const secEl = document.createElement('section');
  secEl.classList.add('st-section');

  const rowEl = document.createElement('div');
  rowEl.classList.add('st-row');

  const frs = [1/3, 1/3, 1/3];
  rowEl.dataset.frs = frs.join(',');

  frs.forEach((fr, idx) => {
    const blockEl = document.createElement('div');
    blockEl.classList.add('st-block');
    blockEl.dataset.fr = String(fr);

    const inner = document.createElement('div');
    inner.classList.add('st-block__content');
    inner.textContent = `Блок ${idx + 1}`;
    blockEl.appendChild(inner);

    rowEl.appendChild(blockEl);
  });

  secEl.appendChild(rowEl);
  siteRoot.appendChild(secEl);

  // Підключаємо до вже існуючих DnD/resize/active-select
  try {
    if (typeof ensureDraggable === 'function') ensureDraggable(secEl);
    if (typeof initActiveSelect === 'function') initActiveSelect(secEl);
    if (typeof initDnD === 'function') initDnD(secEl);
    if (typeof initResize === 'function') initResize(secEl);
    if (typeof applyFrs === 'function') applyFrs(rowEl, frs);
  } catch (e) {
    console.warn('[site-canvas] init new section error:', e);
  }

  document.dispatchEvent(new CustomEvent('builder:structureChanged', {
    detail: { reason: 'add-section' }
  }));
}

window.siteCanvas = window.siteCanvas || {};
window.siteCanvas.addDefaultSection = createDefaultSection;
// ---------- Ініціалізація кнопок панелі сайту ----------


// === ДОДАТИ ЛІНІЮ ========================================================

// js/site-canvas-init.js (фрагмент)

// -------------------------
// ПОШУК КНОПОК У ШАПЦІ
// -------------------------
const addSectionBtn = document.getElementById('add-section-btn');
const addBlockBtn   = document.getElementById('add-block-btn');
const addLineBtn    = document.getElementById('add-line-btn'); // ⬅ твоя кнопка "Додати лінію"

// -------------------------
// ДОПОМІЖНЕ: активна секція
// -------------------------
function getActiveSection() {
  const siteRoot = document.getElementById('site-root');
  if (!siteRoot) return null;

  // Спочатку шукаємо явно активну
  let sec = siteRoot.querySelector('.st-section.is-active');
  if (sec) return sec;

  // Якщо немає — беремо першу секцію
  sec = siteRoot.querySelector('.st-section');
  return sec || null;
}

// -------------------------
// СТВОРЕННЯ ЗВИЧАЙНОГО БЛОКА
// (якщо в тебе вже є така функція — залиш свою)
// -------------------------
function createBlockElement() {
  const el = document.createElement('div');
  el.className = 'st-block';
  el.draggable = true;
  return el;
}

// -------------------------
// СТВОРЕННЯ ЛІНІЇ
// -------------------------
function createLineBlock() {
  const el = document.createElement('div');

  // КЛАСИ ЛІНІЇ
  el.className = 'st-block st-block--line';

  // Маркер типу блока (щоб DnD знав, що це саме лінія)
  el.dataset.blockKind = 'line';

  // Базова орієнтація — горизонтальна
  el.setAttribute('data-line-orientation', 'horizontal');

  // DnD
  el.draggable = true;

  return el;
}

// -------------------------
// КЛІК ПО "+ Додати лінію"
// -------------------------
if (addLineBtn) {
  addLineBtn.addEventListener('click', () => {
    const activeSection = getActiveSection();
    if (!activeSection) return;

    // шукаємо (або створюємо) основний ряд у секції
    let rowEl = activeSection.querySelector(':scope > .st-row');
    if (!rowEl) {
      rowEl = document.createElement('div');
      rowEl.className = 'st-row';
      activeSection.appendChild(rowEl);
    }

    // uid для ряду + state
    const rowId    = uid(rowEl);
    const rowState = ensureRow(rowId);

    // якщо це root-секція — гарантуємо наявність rowId у rootRows
    const parentIsRoot = activeSection.parentElement === root;
    if (parentIsRoot) {
      siteState.page.rootRows = Array.isArray(siteState.page.rootRows)
        ? siteState.page.rootRows
        : [];
      if (!siteState.page.rootRows.includes(rowId)) {
        siteState.page.rootRows.push(rowId);
      }
    }

    // створюємо лінію через state
    addLineToRow(rowId);
  });
}
