// js/design/widgets/gallery-widget/gallery-db.js
// IndexedDB storage for gallery: categories -> folders -> items(files)
// Items store: { id, cat, folderId, name, mime, size, createdAt, blob }

const DB_NAME = 'ShiftTimeGalleryDB';
const DB_VER  = 1;

const STORE_FOLDERS = 'folders';
const STORE_ITEMS   = 'items';

function openDB_() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const st = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
        st.createIndex('byCat', 'cat', { unique: false });
        st.createIndex('byCatParent', ['cat', 'parentId'], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const st = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        st.createIndex('byCatFolder', ['cat', 'folderId'], { unique: false });
        st.createIndex('byCat', 'cat', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx_(db, storeNames, mode = 'readonly') {
  return db.transaction(storeNames, mode);
}

function uid_(p='id') {
  return `${p}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`;
}

export async function galEnsureSeed() {
  const db = await openDB_();
  const t = tx_(db, [STORE_FOLDERS], 'readwrite');
  const st = t.objectStore(STORE_FOLDERS);

  // якщо нема кореневих папок — створимо по одній для кожної категорії
  const cats = ['images','logos','icons'];
  for (const cat of cats) {
    const rootId = `root_${cat}`;
    const got = await new Promise((res) => {
      const r = st.get(rootId);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
    if (!got) {
      st.put({
        id: rootId,
        cat,
        parentId: null,
        name: cat === 'images' ? 'Головна' : (cat === 'logos' ? 'Логотипи' : 'Іконки'),
        createdAt: Date.now()
      });
    }
  }

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
}

export async function galListFolders(cat) {
  const db = await openDB_();
  const t = tx_(db, [STORE_FOLDERS], 'readonly');
  const st = t.objectStore(STORE_FOLDERS);
  const idx = st.index('byCat');

  const folders = await new Promise((resolve, reject) => {
    const req = idx.getAll(cat);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  db.close();
  return folders.sort((a,b)=> (a.name||'').localeCompare(b.name||'', 'uk'));
}

export async function galCreateFolder({ cat, parentId, name }) {
  const db = await openDB_();
  const t = tx_(db, [STORE_FOLDERS], 'readwrite');
  const st = t.objectStore(STORE_FOLDERS);

  const folder = {
    id: uid_('fld'),
    cat,
    parentId: parentId ?? `root_${cat}`,
    name: String(name || 'Нова папка').trim() || 'Нова папка',
    createdAt: Date.now()
  };

  st.put(folder);

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
  return folder;
}

export async function galRenameFolder(folderId, newName) {
  const db = await openDB_();
  const t = tx_(db, [STORE_FOLDERS], 'readwrite');
  const st = t.objectStore(STORE_FOLDERS);

  const folder = await new Promise((res) => {
    const r = st.get(folderId);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });
  if (!folder) { db.close(); return null; }

  folder.name = String(newName || '').trim() || folder.name;
  st.put(folder);

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
  return folder;
}

export async function galDeleteFolder(folderId) {
  // Видаляємо папку + її файли
  const db = await openDB_();
  const t = tx_(db, [STORE_FOLDERS, STORE_ITEMS], 'readwrite');
  const stF = t.objectStore(STORE_FOLDERS);
  const stI = t.objectStore(STORE_ITEMS);
  const idx = stI.index('byCatFolder');

  const folder = await new Promise((res) => {
    const r = stF.get(folderId);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });
  if (!folder) { db.close(); return false; }

  const items = await new Promise((resolve) => {
    const r = idx.getAll([folder.cat, folderId]);
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => resolve([]);
  });

  for (const it of items) stI.delete(it.id);
  stF.delete(folderId);

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
  return true;
}

export async function galListItems(cat, folderId) {
  const db = await openDB_();
  const t = tx_(db, [STORE_ITEMS], 'readonly');
  const st = t.objectStore(STORE_ITEMS);
  const idx = st.index('byCatFolder');

  const items = await new Promise((resolve) => {
    const r = idx.getAll([cat, folderId]);
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => resolve([]);
  });

  db.close();
  return items.sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
}

export async function galAddFiles({ cat, folderId, files }) {
  const db = await openDB_();
  const t = tx_(db, [STORE_ITEMS], 'readwrite');
  const st = t.objectStore(STORE_ITEMS);

  const out = [];
  for (const f of files) {
    const id = uid_('it');
    const item = {
      id,
      cat,
      folderId,
      name: f.name,
      mime: f.type || 'application/octet-stream',
      size: f.size || 0,
      createdAt: Date.now(),
      blob: f
    };
    st.put(item);
    out.push(item);
  }

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
  return out;
}

export async function galDeleteItem(itemId) {
  const db = await openDB_();
  const t = tx_(db, [STORE_ITEMS], 'readwrite');
  const st = t.objectStore(STORE_ITEMS);
  st.delete(itemId);

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  db.close();
  return true;
}

export function galMakeObjectUrl(item) {
  if (!item || !item.blob) return '';
  return URL.createObjectURL(item.blob);
}

// --- rename item (file) ---
// --- rename item (file) ---
export async function galRenameItem(itemId, newName) {
  if (!itemId) return null;

  const name = String(newName || '').trim();
  if (!name) return null;

  const db = await openDB_();
  const t = tx_(db, [STORE_ITEMS], 'readwrite');
  // або якщо хочеш строго: const st = t.objectStore(STORE_ITEMS);
  const st = t.objectStore(STORE_ITEMS);

  const item = await new Promise((res) => {
    const r = st.get(itemId);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => res(null);
  });

  if (!item) {
    db.close();
    return null;
  }

  item.name = name;
  st.put(item);

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });

  db.close();
  return item;
}
