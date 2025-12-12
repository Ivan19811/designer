// js/design/widgets/gallery-widget/gallery-widget.js
import {
  galEnsureSeed,
  galListFolders,
  galCreateFolder,
  galRenameFolder,
  galDeleteFolder,
  galListItems,
  galAddFiles,
  galDeleteItem,
  galRenameItem,
  galMakeObjectUrl




} from './gallery-db.js';

const CAT_LABEL = { images: 'Картинки', logos: 'Логотип', icons: 'Іконки' };

let modalEl = null;
let overlayEl = null;

let state = {
  isOpen: false,
  cat: 'images',
  folderId: 'root_images',
  view: 'big', // small | big | huge | list
  selectedFolderId: null,
   selectedItemIds: [],   // multi-select
  lastSelectedIndex: -1, // для shift-діапазону
   foldersCache: [],
  itemsCache: [],


  pickerMode: false,
  onPick: null
};

function q(sel, root = modalEl) { return root ? root.querySelector(sel) : null; }
function qa(sel, root = modalEl) { return root ? Array.from(root.querySelectorAll(sel)) : []; }

function mountOnce_() {
  if (modalEl) return;

  overlayEl = document.createElement('div');
  overlayEl.className = 'stg-overlay';
  overlayEl.addEventListener('click', () => close());

  modalEl = document.createElement('div');
  modalEl.className = 'stg-modal stg-view-big';

  modalEl.innerHTML = `
    <div class="stg-head" data-stg-drag>
      <div class="stg-title">
        <strong>Галерея</strong>
        <span class="stg-sub" style="color:rgba(148,163,184,0.9);font-size:12px;">— вибір та імпорт</span>
      </div>

      <div class="stg-tabs" data-stg-tabs>
        <button class="stg-tab" data-cat="images">Картинки</button>
        <button class="stg-tab" data-cat="logos">Логотип</button>
        <button class="stg-tab" data-cat="icons">Іконки</button>
      </div>

      <div class="stg-actions">
       <button class="stg-btn" data-act="addFolder">Додати папку</button>
        <button class="stg-btn" data-act="renameFolder">Редагувати папку</button>
        <button class="stg-btn" data-act="renameFile">Редагувати файл</button>
        <button class="stg-btn" data-act="delete">Видалити</button>
        <button class="stg-btn" data-act="addFile">Додати файл</button>
      </div>
    </div>

    <div class="stg-body">
      <div class="stg-left">
        <div class="stg-tree" data-stg-tree></div>
        <div class="stg-drop-hint" data-stg-dropzone>
          Перетягни файли сюди або прямо на папку (копіювання в галерею).
        </div>
      </div>

      <div class="stg-right">
        <div class="stg-sizes" data-stg-views>
          <span style="font-size:12px;color:rgba(148,163,184,0.9);margin-right:6px;">Вигляд:</span>
          <button class="stg-pill" data-view="small">Малі</button>
          <button class="stg-pill" data-view="big">Великі</button>
          <button class="stg-pill" data-view="huge">Дуже великі</button>
          <button class="stg-pill" data-view="list">Список</button>
          <span style="flex:1"></span>
          <button class="stg-btn" data-act="insert" title="Вставити (для режиму вибору)">Вставити</button>
        </div>

        <div class="stg-grid" data-stg-grid></div>

        <div class="stg-resizer" data-stg-resize></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  document.body.appendChild(modalEl);

  bindHeaderActions_();
  bindTabs_();
  bindViews_();
  bindDragDrop_();
  bindKeyboard_();


  makeDraggable_(modalEl, q('[data-stg-drag]'));
  makeResizable_(modalEl, q('[data-stg-resize]'));
}

function setView_(view) {
  state.view = view;
  modalEl.classList.remove('stg-view-small','stg-view-big','stg-view-huge','stg-view-list');
  modalEl.classList.add(view === 'small' ? 'stg-view-small' :
                    view === 'huge'  ? 'stg-view-huge'  :
                    view === 'list'  ? 'stg-view-list'  : 'stg-view-big');
  qa('[data-stg-views] .stg-pill').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
}

function setCat_(cat) {
  state.cat = cat;
  state.folderId = `root_${cat}`;
  state.selectedFolderId = state.folderId;
   state.selectedItemIds = [];
  state.lastSelectedIndex = -1;

  qa('[data-stg-tabs] .stg-tab').forEach(t => t.classList.toggle('is-active', t.dataset.cat === cat));
  refresh_();
}

async function refresh_() {
  await galEnsureSeed();
  const folders = await galListFolders(state.cat);
  renderFolders_(folders);
state.foldersCache = folders || [];



  // ensure current folder exists
  const existing = folders.find(f => f.id === state.folderId);
  if (!existing) state.folderId = `root_${state.cat}`;

  const items = await galListItems(state.cat, state.folderId);
  renderItems_(items);
   state.itemsCache = items || [];


  // header title
  const title = q('.stg-title strong');
  if (title) title.textContent = `Галерея — ${CAT_LABEL[state.cat] || 'Категорія'}`;

  // show insert button only in picker mode
  const insBtn = q('[data-act="insert"]');
  if (insBtn) insBtn.style.display = state.pickerMode ? 'inline-flex' : 'none';
}

function renderFolders_(folders) {
  const tree = q('[data-stg-tree]');
  if (!tree) return;
  tree.innerHTML = '';

  // only flat list for v1 (root + custom). Next step: nesting by parentId
  const list = folders.filter(f => f.cat === state.cat);

  list.forEach(f => {
    const row = document.createElement('div');
    row.className = 'stg-folder';
    row.dataset.folderId = f.id;
    row.innerHTML = `
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📁 ${escapeHtml_(f.name)}</span>
      <span style="color:rgba(148,163,184,0.8);font-size:11px;">${f.id.startsWith('root_') ? 'root' : ''}</span>
    `;
    row.classList.toggle('is-active', f.id === state.folderId);
    row.addEventListener('click', () => {
      state.folderId = f.id;
      state.selectedFolderId = f.id;
       state.selectedItemIds = [];
  state.lastSelectedIndex = -1;
      refresh_();
    });

    // drop files onto folder
    row.addEventListener('dragover', (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      row.style.borderColor = 'rgba(34,197,94,0.7)';
    });
    row.addEventListener('dragleave', () => {
      row.style.borderColor = '';
    });
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.style.borderColor = '';
      const files = Array.from(e.dataTransfer?.files || []).filter(Boolean);
      if (!files.length) return;
      await galAddFiles({ cat: state.cat, folderId: f.id, files });
      state.folderId = f.id;
      refresh_();
    });

    tree.appendChild(row);
  });
}

function isSelected_(id) {
  return state.selectedItemIds.includes(id);
}

function setSelectedSingle_(id, idx) {
  state.selectedItemIds = [id];
  state.lastSelectedIndex = typeof idx === 'number' ? idx : -1;
}

function toggleSelected_(id, idx) {
  const has = isSelected_(id);
  state.selectedItemIds = has
    ? state.selectedItemIds.filter(x => x !== id)
    : [...state.selectedItemIds, id];
  state.lastSelectedIndex = typeof idx === 'number' ? idx : state.lastSelectedIndex;
}

function setSelectedRange_(items, fromIdx, toIdx) {
  const a = Math.min(fromIdx, toIdx);
  const b = Math.max(fromIdx, toIdx);
  const ids = items.slice(a, b + 1).map(x => x.id);
  // робимо унікальним (на всяк випадок)
  state.selectedItemIds = Array.from(new Set(ids));
}




function renderItems_(items) {
  const grid = q('[data-stg-grid]');
  if (!grid) return;
  grid.innerHTML = '';

  items.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'stg-item';
    card.dataset.itemId = it.id;
    card.classList.toggle('is-selected', isSelected_(it.id));
    const thumb = document.createElement('div');
    thumb.className = 'stg-thumb';

    // thumbnail for images only
    if (it.mime.startsWith('image/')) {
      const img = document.createElement('img');
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      img.alt = it.name;
      const url = galMakeObjectUrl(it);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = `<span style="color:rgba(148,163,184,0.95);font-size:12px;">${escapeHtml_(it.mime)}</span>`;
    }

    const name = document.createElement('div');
    name.className = 'stg-name';
    name.textContent = it.name;

    card.appendChild(thumb);
    card.appendChild(name);

   card.addEventListener('click', (e) => {
  const ctrl = e.ctrlKey || e.metaKey; // Windows/Linux CTRL, Mac CMD
  const shift = e.shiftKey;

  if (shift && state.lastSelectedIndex >= 0) {
    // shift range selection
    setSelectedRange_(items, state.lastSelectedIndex, idx);
  } else if (ctrl) {
    // toggle single
    toggleSelected_(it.id, idx);
  } else {
    // single select
    setSelectedSingle_(it.id, idx);
  }

  // apply UI
  qa('.stg-item').forEach(n => n.classList.toggle('is-selected', isSelected_(n.dataset.itemId)));
});

   card.addEventListener('dblclick', () => {
  // dblclick робимо як single select (щоб було прогнозовано)
  setSelectedSingle_(it.id, idx);
  qa('.stg-item').forEach(n => n.classList.toggle('is-selected', isSelected_(n.dataset.itemId)));
  if (state.pickerMode) doInsert_();
});


    grid.appendChild(card);
  });
}


function normalizeName_(s) {
  return String(s || '').trim().toLowerCase();
}

function folderNameExists_(name, exceptId = null) {
  const n = normalizeName_(name);
  return (state.foldersCache || []).some(f =>
    f.id !== exceptId &&
    normalizeName_(f.name) === n
  );
}

function fileNameExistsInFolder_(name, exceptIds = []) {
  const n = normalizeName_(name);
  const except = new Set(exceptIds);
  return (state.itemsCache || []).some(it =>
    !except.has(it.id) &&
    normalizeName_(it.name) === n
  );
}




function bindHeaderActions_() {
  modalEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;

    const act = btn.dataset.act;

    if (act === 'close') return close();

    if (act === 'addFolder') {
      const name = prompt('Назва папки:', 'Нова папка');
      if (!name) return;
      await galCreateFolder({ cat: state.cat, parentId: `root_${state.cat}`, name });
      await refresh_();
      return;
    }

    // --- RENAME FOLDER (з підстановкою поточної назви) ---
    if (act === 'renameFolder') {
  const fid = state.selectedFolderId || state.folderId;
  if (!fid) return;
  if (fid.startsWith('root_')) return alert('Root папку не перейменовуємо.');

  const f = (state.foldersCache || []).find(x => x.id === fid);
  const current = f?.name || '';
  const name = prompt('Нова назва папки:', current);
  if (!name) return;

  if (folderNameExists_(name, fid)) {
    alert('Папка з таким іменем уже існує. Виберіть інше імʼя.');
    return;
  }

  await galRenameFolder(fid, name);
  await refresh_();
  return;
}

    // --- RENAME FILE(S) (single або multi з _1 _2 ...) ---
    if (act === 'renameFile') {
      const ids = Array.isArray(state.selectedItemIds) ? state.selectedItemIds : [];
      if (!ids.length) return alert('Вибери файл(и) для перейменування.');

      const map = new Map((state.itemsCache || []).map(it => [it.id, it]));
      const first = map.get(ids[0]);
      const firstName = first?.name || '';

      const split_ = (n) => {
        const s = String(n || '');
        const i = s.lastIndexOf('.');
        if (i > 0 && i < s.length - 1) return { base: s.slice(0, i), ext: s.slice(i) };
        return { base: s, ext: '' };
      };

      if (ids.length === 1) {
        const { ext } = split_(firstName);
        const next = prompt('Нова назва файлу:', firstName);
        if (!next) return;

        const trimmed = next.trim();

        // якщо ввели без розширення — залишаємо старе
        const nextHasExt = trimmed.includes('.') && trimmed.lastIndexOf('.') > 0;
        const finalName = nextHasExt ? trimmed : (trimmed + ext);

        
        
        
       if (fileNameExistsInFolder_(finalName, ids)) {
  alert('Файл з таким іменем уже існує в цій папці. Виберіть інше імʼя.');
  return;
}

await galRenameItem(ids[0], finalName);
await refresh_();
return;
      }

      // multi: просимо базову назву
      const basePrompt = prompt('Нова базова назва (для групи):', split_(firstName).base || '');
      if (!basePrompt) return;
      const baseNew = basePrompt.trim();
      if (!baseNew) return;

      // якщо хочеш, щоб нумерація була стабільна — можна сортувати ids по createdAt із map
      // але поки залишаємо порядок selection
      
      
     // перевіряємо всі майбутні імена наперед
let k = 1;
for (const id of ids) {
  const it = map.get(id);
  const { ext } = split_(it?.name || '');
  const testName = `${baseNew}_${k}${ext}`;

  if (fileNameExistsInFolder_(testName, ids)) {
    alert(`Файл з іменем "${testName}" уже існує. Виберіть іншу базову назву.`);
    return;
  }
  k++;
}

// якщо все ок — перейменовуємо
k = 1;
for (const id of ids) {
  const it = map.get(id);
  const { ext } = split_(it?.name || '');
  const finalName = `${baseNew}_${k}${ext}`;
  await galRenameItem(id, finalName);
  k++;
}

await refresh_();
return;








      await refresh_();
      return;
    }

    // --- DELETE (multi items first, else folder) ---
    if (act === 'delete') {
      if (state.selectedItemIds && state.selectedItemIds.length) {
        const count = state.selectedItemIds.length;
        const ok = confirm(`Видалити файли (${count} шт.)?`);
        if (!ok) return;

        for (const id of state.selectedItemIds) {
          await galDeleteItem(id);
        }

        state.selectedItemIds = [];
        state.lastSelectedIndex = -1;
        await refresh_();
        return;
      }

      const fid = state.selectedFolderId || state.folderId;
      if (!fid || fid.startsWith('root_')) return alert('Root папку не видаляємо.');

      const ok = confirm('Видалити папку і всі файли в ній?');
      if (!ok) return;

      await galDeleteFolder(fid);
      state.folderId = `root_${state.cat}`;
      state.selectedFolderId = state.folderId;
      await refresh_();
      return;
    }

    // --- ADD FILE ---
    if (act === 'addFile') {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        await galAddFiles({ cat: state.cat, folderId: state.folderId, files });
        await refresh_();
      };
      input.click();
      return;
    }

    // --- INSERT (picker mode) ---
    if (act === 'insert') {
      doInsert_();
      return;
    }
  });
}










function bindTabs_() {
  qa('[data-stg-tabs] .stg-tab').forEach(tab => {
    tab.addEventListener('click', () => setCat_(tab.dataset.cat));
  });
}

function bindViews_() {
  qa('[data-stg-views] .stg-pill').forEach(p => {
    p.addEventListener('click', () => {
      setView_(p.dataset.view);
    });
  });
}

function bindDragDrop_() {
  const dz = q('[data-stg-dropzone]');
  if (!dz) return;

  dz.addEventListener('dragover', (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    dz.style.borderColor = 'rgba(34,197,94,0.7)';
  });
  dz.addEventListener('dragleave', () => {
    dz.style.borderColor = '';
  });
  dz.addEventListener('drop', async (e) => {
    e.preventDefault();
    dz.style.borderColor = '';
    const files = Array.from(e.dataTransfer?.files || []).filter(Boolean);
    if (!files.length) return;
    await galAddFiles({ cat: state.cat, folderId: state.folderId, files });
    refresh_();
  });

     // ---- DROP прямо в активну папку (права область "вміст") ----
  const grid = q('[data-stg-grid]');
  if (grid) {
    grid.addEventListener('dragover', (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      grid.classList.add('is-drop-target');
    });

    grid.addEventListener('dragleave', (e) => {
      // коли виходимо за межі гріда — прибрати підсвітку
      const to = e.relatedTarget;
      if (to && grid.contains(to)) return;
      grid.classList.remove('is-drop-target');
    });

    grid.addEventListener('drop', async (e) => {
      e.preventDefault();
      grid.classList.remove('is-drop-target');

      const files = Array.from(e.dataTransfer?.files || []).filter(Boolean);
      if (!files.length) return;

      // ✅ саме активна папка (відкрита)
      await galAddFiles({ cat: state.cat, folderId: state.folderId, files });
      await refresh_();
    });
  }
}

function bindKeyboard_() {
  window.addEventListener('keydown', async (e) => {
    // працюємо тільки коли модалка реально відкрита
    if (!state.isOpen) return;

    // якщо фокус в полі вводу — не чіпаємо
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const key = (e.key || '').toLowerCase();
    const isCtrl = e.ctrlKey || e.metaKey;

    // ESC — скинути виділення файлів
    if (key === 'escape') {
      if (state.selectedItemIds?.length) {
        e.preventDefault();
        state.selectedItemIds = [];
        state.lastSelectedIndex = -1;
        qa('.stg-item').forEach(n => n.classList.remove('is-selected'));
      }
      return;
    }

    // CTRL+A — виділити всі файли в папці
    if (isCtrl && key === 'a') {
      e.preventDefault();
      const all = (state.itemsCache || []).map(it => it.id);
      state.selectedItemIds = all;
      state.lastSelectedIndex = all.length ? 0 : -1;
      qa('.stg-item').forEach(n => n.classList.toggle('is-selected', state.selectedItemIds.includes(n.dataset.itemId)));
      return;
    }

    // DELETE / BACKSPACE — видалити
    if (key === 'delete' || key === 'backspace') {
      e.preventDefault();
      // симулюємо клік на кнопку delete (щоб не дублювати логіку)
      const delBtn = q('[data-act="delete"]');
      if (delBtn) delBtn.click();
      return;
    }

    // F2 — перейменувати (файл або папку)
    if (e.key === 'F2') {
      e.preventDefault();

      if (state.selectedItemIds && state.selectedItemIds.length) {
        const b = q('[data-act="renameFile"]');
        if (b) b.click();
        return;
      }

      // якщо файлів нема — перейменовуємо папку (якщо не root)
      const fid = state.selectedFolderId || state.folderId;
      if (!fid || String(fid).startsWith('root_')) return;

      const b = q('[data-act="renameFolder"]');
      if (b) b.click();
      return;
    }
  });
}






function doInsert_() {
  if (!state.pickerMode) return;

  const first = (state.selectedItemIds && state.selectedItemIds[0]) || null;
  if (!first) return alert('Вибери файл.');
  const payload = { cat: state.cat, folderId: state.folderId, itemId: first };




  const cb = state.onPick;
  close();
  if (typeof cb === 'function') cb(payload);
}

export async function openGalleryModal(opts = {}) {
  mountOnce_();
  await galEnsureSeed();

  state.pickerMode = !!opts.pickerMode;
  state.onPick = typeof opts.onPick === 'function' ? opts.onPick : null;

  // open with desired cat
  const cat = opts.cat || 'images';
  setCat_(cat);

  // set default view
  setView_(opts.view || 'big');

  overlayEl.classList.add('is-open');
  modalEl.classList.add('is-open');
  state.isOpen = true;

  await refresh_();
}

export function close() {
  if (!modalEl) return;
  overlayEl.classList.remove('is-open');
  modalEl.classList.remove('is-open');
  state.isOpen = false;
  state.pickerMode = false;
  state.onPick = null;
}

function makeDraggable_(panel, handle) {
  if (!panel || !handle) return;
  let dragging = false;
  let sx=0, sy=0, px=0, py=0;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    handle.style.cursor = 'grabbing';
    sx = e.clientX; sy = e.clientY;

    const r = panel.getBoundingClientRect();
    px = r.left; py = r.top;

    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    panel.style.left = `${Math.max(10, px + dx)}px`;
    panel.style.top  = `${Math.max(10, py + dy)}px`;
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.style.cursor = 'grab';
  });
}

function makeResizable_(panel, handle) {
  if (!panel || !handle) return;
  let resizing = false;
  let sx=0, sy=0, w=0, h=0;

  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    resizing = true;
    sx = e.clientX; sy = e.clientY;
    const r = panel.getBoundingClientRect();
    w = r.width; h = r.height;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    panel.style.width  = `${Math.max(720, w + dx)}px`;
    panel.style.height = `${Math.max(420, h + dy)}px`;
  });

  window.addEventListener('mouseup', () => {
    resizing = false;
  });
}

function escapeHtml_(s) {
  return String(s||'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}


// --- Design panel widget (accordion section) ---
// panel-design.js очікує named export initGalleryWidget(host)
// Вона додає секцію "Галерея" в панель Дизайн і відкриває нашу модалку openGalleryModal().
export function initGalleryWidget(host) {
  if (!host) return;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section';

  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Галерея</span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>

    <div class="design-section__body">
      <div class="design-field">
        <div class="design-field__label">Категорії</div>

        <div class="design-field__row" style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="design-pill" type="button" data-gal-open="images">Картинки</button>
          <button class="design-pill" type="button" data-gal-open="logos">Логотип</button>
          <button class="design-pill" type="button" data-gal-open="icons">Іконки</button>
        </div>

        <div style="margin-top:8px;color:rgba(148,163,184,0.9);font-size:12px;">
          Відкриває менеджер файлів (локально) — drag&drop, папки, режими вигляду.
        </div>
      </div>
    </div>
  `;

  host.appendChild(sectionEl);

  // акордеон
  const header = sectionEl.querySelector('.design-section__header');
  if (header) {
    header.addEventListener('click', () => {
      sectionEl.classList.toggle('is-open');
    });
  }

  // кнопки відкриття
  sectionEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gal-open]');
    if (!btn) return;

    const cat = btn.dataset.galOpen || 'images';
    openGalleryModal({ cat, pickerMode: false, view: 'big' });
  });
}

