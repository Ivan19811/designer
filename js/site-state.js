// js/site-state.js
export const siteState = {
  version: 1,
  page: {
    id: "page_home",
    rootRows: [],      // верхні ряди (як було)
    rootSections: []   // верхні секції (ми додали)
  },
  rows: {},       // rowId -> { id, type:"row", children:[blockId], columns:[fr...] }
  blocks: {},     // blockId -> { id, type:"block"|"block-container", childrenRow:null|rowId, height:null }
  sections: {}    // secId -> { id, rowId, parentId, children:[secId] }
};

export function ensureRow(id) {
  if (!siteState.rows[id]) {
    siteState.rows[id] = { id, type: "row", children: [], columns: [] };
  }
  return siteState.rows[id];
}

export function ensureBlock(id) {
  const blocks = siteState.blocks;

  if (!blocks[id]) {
    // Базова структура блока
    blocks[id] = {
      id,
      type: "block",          // "block" або "block-container"
      childrenRow: null,      // rowId, якщо це контейнер
      height: null,           // кастомна висота (px), або null
      // 🔹 нові поля для підтримки ліній
      kind: "block",          // "block" або "line"
      lineOrientation: null   // "horizontal" | "vertical" для kind === "line"
    };
  } else {
    // Якщо блок уже існує зі старої версії state — гарантуємо наявність нових полів
    const b = blocks[id];
    if (!("kind" in b)) b.kind = "block";
    if (!("lineOrientation" in b)) b.lineOrientation = null;
  }

  return blocks[id];
}

