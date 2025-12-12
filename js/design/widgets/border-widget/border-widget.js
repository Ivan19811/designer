// js/design/widgets/border-widget/border-widget.js
// Віджет "Бордер" для панелі "Дизайн"
// Під-акордеони (Рамка / Радіуси / Тіні / Підсвічування)
// + робота з глобальним режимом вибору (Нічого / Блоки / Секції)

import { initBorderLinesWidget } from './lines/lines-widget.js';
import { initBorderRadiusWidget } from './radius/radius-widget.js';
import { initBorderShadowsWidget } from './shadows/shadows-widget.js';
import { initBorderColorWidget } from './color/color-widget.js';
import { initBorderStyleWidget } from './border-style/style-widget.js';
import { BASE_STYLES, DECOR_STYLES, USER_IMAGE_STYLES } from './border-style/presets.js';




// ключ для стану під-акордеонів
const BORDER_SUBSECTIONS_STATE_KEY = 'st_design_border_subsections_v1';

// debug-прапорець для виділення / логів
const BORDER_DEBUG_SELECTION = true;

function bwLog() {
  if (!BORDER_DEBUG_SELECTION) return;
  const args = Array.prototype.slice.call(arguments);
  args.unshift('[border-select]');
  console.log.apply(console, args);
}

// ---- збереження стану під-акордеонів ("Рамка", "Радіуси" тощо) ----
function loadBorderSubsectionsState() {
  try {
    const raw = window.localStorage.getItem(BORDER_SUBSECTIONS_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('[border-widget] Failed to load subsections state', err);
    return {};
  }
}

function saveBorderSubsectionsState(state) {
  try {
    window.localStorage.setItem(
      BORDER_SUBSECTIONS_STATE_KEY,
      JSON.stringify(state || {})
    );
  } catch (err) {
    console.warn('[border-widget] Failed to save subsections state', err);
  }
}

// ---- основна ініціалізація віджета ----
export function initBorderWidget(host, getSelection) {
  if (!host) return;

  // Режим цілей: 'none' | 'blocks' | 'sections'
  let targetMode = 'none';

  const sectionEl = document.createElement('section');
  sectionEl.className = 'design-section';

  // ---- СТАН РАМКИ (ПІДВІДЖЕТ "Рамка") ----
 let borderLinesState = {
    mode: 'none',   // 'none' | 'on'
    preset: 'none', // 'none' | 'thin' | 'medium' | 'thick' | 'custom'
    sides: 'all'    // 'all' | 'top' | 'right' | 'bottom' | 'left' | 'tb' | 'lr'
  };

  // Стан радіусів для поточного вибору
  let borderRadiusState = {
    radius: 18,
    corners: {
      tl: true,
      tr: true,
      br: true,
      bl: true
    },
    preset: 'custom'
  };

  let borderLinesController = null;
  let borderRadiusController = null;

  let borderStyleState = {
      style: 'solid'
    };

    let borderStyleController = null;










  // ---- допоміжне: колір бордера за замовчуванням (як у блоків) ----
  function getSiteDefaultBorderColor() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) return '';
    const cs = getComputedStyle(siteRoot);
    const val = cs.getPropertyValue('--site-block-brd').trim();
    return val || '';
  }

  function ensureDefaultBorderColor(el) {
    if (!(el instanceof HTMLElement)) return;
    const clr = getSiteDefaultBorderColor();
    if (clr) {
      el.style.borderColor = clr;
    }
  }

  // Допоміжний логгер стану бордера елемента
  function dbgBorderState(label, el, idx) {
    if (!(el instanceof HTMLElement)) return;

    const cs = getComputedStyle(el);
    const cls = Array.from(el.classList).join('.');

    bwLog(
      `[border-debug] ${label} [${idx}] ${el.tagName}.${cls}`,
      {
        borderTop:    `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
        borderRight:  `${cs.borderRightWidth} ${cs.borderRightStyle} ${cs.borderRightColor}`,
        borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
        borderLeft:   `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
        outline:      `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        boxShadow:    cs.boxShadow
      }
    );
  }

  // Тимчасове вимкнення hover-підсвітки, щоб було видно реальний колір рамки / лінії
  let hoverOutlineTimer = null;

  function temporarilyDisableHoverOutlines() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) return;

    siteRoot.classList.add('st-no-hover-outline');

    if (hoverOutlineTimer) {
      clearTimeout(hoverOutlineTimer);
    }

    hoverOutlineTimer = window.setTimeout(() => {
      siteRoot.classList.remove('st-no-hover-outline');
      hoverOutlineTimer = null;
    }, 1200); // ~1.2 секунди; можна підкрутити
  }







  // --- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ КОЛЬОРУ БОРДЕРА ---

  function hexToRgb(hex) {
    let v = (hex || '').trim();
    if (!v) return { r: 0, g: 0, b: 0 };
    if (v[0] === '#') v = v.slice(1);
    if (v.length === 3) {
      v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    }
    if (v.length !== 6) return { r: 0, g: 0, b: 0 };
    const r = parseInt(v.slice(0, 2), 16) || 0;
    const g = parseInt(v.slice(2, 4), 16) || 0;
    const b = parseInt(v.slice(4, 6), 16) || 0;
    return { r, g, b };
  }

  function rgbToRgbaStr(rgb, alpha) {
    const a = Math.max(0, Math.min(1, alpha || 1));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  function mixToGray(rgb, desat) {
    // desat: 0..1
    const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
    const k = Math.max(0, Math.min(1, desat || 0));
    return {
      r: Math.round(rgb.r * (1 - k) + gray * k),
      g: Math.round(rgb.g * (1 - k) + gray * k),
      b: Math.round(rgb.b * (1 - k) + gray * k)
    };
  }

  function colorToRgbaWithControls(hex, opacityPct, desatPct) {
    const rgbBase = hexToRgb(hex);
    const desat = (desatPct || 0) / 100;
    const rgb = mixToGray(rgbBase, desat);
    const alpha = (opacityPct || 100) / 100;
    return rgbToRgbaStr(rgb, alpha);
  }

  function buildBorderGradientCss(c1, c2, split, blend) {
    // c1, c2 — вже rgba()
    let p = Number(split);
    if (Number.isNaN(p)) p = 50;
    p = Math.max(0, Math.min(100, Math.round(p)));

    let b = Number(blend);
    if (Number.isNaN(b)) b = 0;
    b = Math.max(0, Math.min(50, Math.round(b)));

    if (b === 0) {
      return `linear-gradient(90deg, ${c1} 0%, ${c1} ${p}%, ${c2} ${p}%, ${c2} 100%)`;
    }

    const startMix = Math.max(0, p - b);
    const endMix   = Math.min(100, p + b);

    return `linear-gradient(
      90deg,
      ${c1} 0%,
      ${c1} ${startMix}%,
      ${c2} ${endMix}%,
      ${c2} 100%
    )`;
  }





  // --- ЗАСТОСУВАННЯ РАМКИ ДО ТАРГЕТІВ ---
   // --- ЗАСТОСУВАННЯ РАМКИ ДО ТАРГЕТІВ ---
    // --- ЗАСТОСУВАННЯ РАМКИ ДО ТАРГЕТІВ ---
   // --- ЗАСТОСУВАННЯ РАМКИ ДО ТАРГЕТІВ ---
    // --- ЗАСТОСУВАННЯ РАМКИ ДО ТАРГЕТІВ ---
  function applyBorderLinesToTargets() {
    const targets = getBorderTargets();

    bwLog(
      '[border-widget] applyBorderLinesToTargets:',
      'mode =', borderLinesState.mode,
      'preset =', borderLinesState.preset,
      'sides =', borderLinesState.sides,
      'targets =', targets.length
    );

    if (!targets.length) {
      bwLog('[border-widget] applyBorderLinesToTargets: немає вибраних елементів');
      return;
    }

    const { mode, preset, sides } = borderLinesState;

const widthMap = {
  none:   0,
  thin:   1, // тонка
  medium: 3, // середня
  thick:  5, // товста
  mixed:  3, // запасний варіант, якщо раптом десь пролізе
  custom: 3  // “власна” базово як середня
};

    // ----------------------------
    // РЕЖИМ "НЕМАЄ РАМКИ"
    // ----------------------------
    if (mode === 'none') {
      targets.forEach((el, idx) => {
        dbgBorderState('BEFORE mode=none', el, idx);

        // ❗ тільки ставимо прапорець "рамка вимкнена"
        //    НІЯКИХ border-width = 0px тут не робимо
        el.classList.add('st-border-off');

        dbgBorderState('AFTER  mode=none', el, idx);
        bwLog('[border-widget] [mode=none] target off →', idx, el);
      });

      bwLog('[border-widget] mode=none: вимкнули рамку для', targets.length, 'елементів');
      return;
    }

    // ----------------------------
    // РЕЖИМ "Є РАМКА"
    // ----------------------------
    const px = widthMap[preset] != null ? widthMap[preset] : 1;
    const pxStr = px + 'px';

    bwLog(
      '[border-widget] mode=on:',
      'preset =', preset,
      'px =', px,
      'sides =', sides,
      'targets =', targets.length
    );




    //---------------------------------------------------------
      targets.forEach((el, idx) => {
      dbgBorderState('BEFORE mode=' + borderLinesState.mode, el, idx);

      // при увімкненні бордера завжди знімаємо прапорець
      el.classList.remove('st-border-off');

      // 🔹 Спец-логіка для СЕКЦІЙ:
      // "тонка" рамка = базова картка (box-shadow), без додаткового border 1px
      let pxForEl = px;
      if (el.classList.contains('st-section') && preset === 'thin') {
        pxForEl = 0;
      }

      const zero = pxForEl === 0;
      const pxStrLocal = pxForEl + 'px';

      // Всі сторони
      if (sides === 'all') {
        el.style.borderTopWidth    = zero ? '' : pxStrLocal;
        el.style.borderRightWidth  = zero ? '' : pxStrLocal;
        el.style.borderBottomWidth = zero ? '' : pxStrLocal;
        el.style.borderLeftWidth   = zero ? '' : pxStrLocal;

        if (!zero) {
          const cs = getComputedStyle(el);
          if (cs.borderTopStyle === 'none') {
            el.style.borderStyle = 'solid';
            ensureDefaultBorderColor(el);
          }
        }

        const csAfter = getComputedStyle(el);
        bwLog(
          `[border-widget] [mode=on/all] target[${idx}] widths:`,
          csAfter.borderTopWidth,
          csAfter.borderRightWidth,
          csAfter.borderBottomWidth,
          csAfter.borderLeftWidth
        );

        dbgBorderState('AFTER  mode=' + borderLinesState.mode, el, idx);
        return;
      }

      // Конкретні сторони
      const cs = getComputedStyle(el);
      const baseStyle = cs.borderTopStyle === 'none' ? 'solid' : cs.borderTopStyle;

      const setSide = (side, active) => {
        if (!active) return;

        const widthProp = 'border' + side + 'Width';
        const styleProp = 'border' + side + 'Style';

        if (zero) {
          // повертаємось до значення з CSS ('' означає "як у стилях")
          el.style[widthProp] = '';
        } else {
          el.style[widthProp] = pxStrLocal;
          if (cs[styleProp] === 'none') {
            el.style[styleProp] = baseStyle || 'solid';
            ensureDefaultBorderColor(el);
          }
        }
      };










      const isTB = sides === 'tb';
      const isLR = sides === 'lr';

      setSide('Top',    sides === 'top'    || isTB);
      setSide('Bottom', sides === 'bottom' || isTB);
      setSide('Left',   sides === 'left'   || isLR);
      setSide('Right',  sides === 'right'  || isLR);

      const csAfter = getComputedStyle(el);
      bwLog(
        `[border-widget] [mode=on/sides] target[${idx}] widths:`,
        csAfter.borderTopWidth,
        csAfter.borderRightWidth,
        csAfter.borderBottomWidth,
        csAfter.borderLeftWidth
      );

      dbgBorderState('AFTER  mode=' + borderLinesState.mode, el, idx);
    });
  }

  function applyBorderRadiusToTargets() {
    const targets = getBorderTargets();

    bwLog(
      '[border-widget] applyBorderRadiusToTargets:',
      'radius =', borderRadiusState.radius,
      'corners =', borderRadiusState.corners,
      'targets =', targets.length
    );

    if (!targets.length) {
      bwLog('[border-widget] applyBorderRadiusToTargets: немає вибраних елементів');
      return;
    }

    const radius = Math.max(
      0,
      Math.min(999, Math.round(borderRadiusState.radius || 0))
    );
    const pxStr = radius + 'px';
    const corners = borderRadiusState.corners || {};

    // за замовчуванням true, якщо явно не false
    const tl = corners.tl !== false;
    const tr = corners.tr !== false;
    const br = corners.br !== false;
    const bl = corners.bl !== false;

    targets.forEach((el, idx) => {
      if (!(el instanceof HTMLElement)) return;

      if (tl) el.style.borderTopLeftRadius = pxStr;
      if (tr) el.style.borderTopRightRadius = pxStr;
      if (br) el.style.borderBottomRightRadius = pxStr;
      if (bl) el.style.borderBottomLeftRadius = pxStr;

      bwLog(
        '[border-widget] [radius] target[' + idx + '] →',
        {
          tl: tl ? pxStr : '(skip)',
          tr: tr ? pxStr : '(skip)',
          br: br ? pxStr : '(skip)',
          bl: bl ? pxStr : '(skip)'
        }
      );
    });
  }

  function applyBorderStyleToTargets() {
  const targets = getBorderTargets();
  if (!targets.length) {
    bwLog('[border-widget] applyBorderStyleToTargets: немає таргетів');
    return;
  }

  const style = borderStyleState.style;

  targets.forEach(el => {
    if (!(el instanceof HTMLElement)) return;

    // Спочатку очищаємо всі декоративні класи + користувацький border-image
    el.classList.remove(
      'st-border-wavy',
      'st-border-dashdot',
      'st-border-big-dots',
      'st-border-star-line'
    );
    el.style.borderImageSource = '';
    el.style.borderImageSlice = '';
    el.style.borderImageRepeat = '';

    // БАЗОВІ СТИЛІ (solid, dashed, dotted, ...)
    const base = BASE_STYLES.find(x => x.id === style);
    if (base) {
      el.style.borderStyle = style;
      return;
    }

    // ДЕКОРАТИВНІ СТИЛІ (через класи)
    const decor = DECOR_STYLES.find(x => x.id === style);
    if (decor) {
      el.style.borderStyle = 'solid';
      if (decor.className) {
        el.classList.add(decor.className);
      }
      return;
    }

    // КАСТОМНІ СТИЛІ КОРИСТУВАЧА (border-image)
    const user = USER_IMAGE_STYLES.find(x => x.id === style);
    if (user && user.imgUrl) {
      el.style.borderStyle = 'solid';
      el.style.borderImageSource = `url('${user.imgUrl}')`;
      el.style.borderImageSlice = 30;
      el.style.borderImageRepeat = 'round';
      return;
    }

    // Якщо стиль не знайдено — дефолт
    el.style.borderStyle = 'solid';
  });

  bwLog('[border-widget] applyBorderStyleToTargets: стиль =', style, 'таргетів =', targets.length);
}

 function applyBorderColorToTargets(colorState) {
    const targets = getBorderTargets();
    if (!targets.length) {
      bwLog('[border-widget] applyBorderColorToTargets: немає таргетів');
      return;
    }

    // 🔹 Вимикаємо hover-підсвітку на короткий час,
    //    щоб не перекривала реальний колір рамки / лінії
    temporarilyDisableHoverOutlines();



    const mode = colorState && colorState.mode ? colorState.mode : 'solid';
    const opacity = colorState && typeof colorState.opacity === 'number'
      ? colorState.opacity
      : 100;
    const desat = colorState && typeof colorState.desaturate === 'number'
      ? colorState.desaturate
      : 0;






    if (mode === 'solid') {
      const hex = (colorState && colorState.solidColor) || '#38bdf8';
      const rgba = colorToRgbaWithControls(hex, opacity, desat);

            targets.forEach((el, idx) => {
        if (!(el instanceof HTMLElement)) return;

        // Для базових стилів: просто кидаємо в borderColor
        el.style.borderImageSource = '';
        el.style.borderColor = rgba;

        // 🔹 Якщо це наша лінія – синхронізуємо основну змінну для лінії
        if (el.classList.contains('st-block--line')) {
          el.style.setProperty('--site-block-brd', rgba);
        }

        dbgBorderState('COLOR solid[' + idx + ']', el, idx);
      });


      bwLog('[border-widget] applyBorderColorToTargets: solid', hex, '→', targets.length, 'елементів');
      return;
    }



    

       if (mode === 'gradient') {
      const hex1 = (colorState && colorState.gradColor1) || '#38bdf8';
      const hex2 = (colorState && colorState.gradColor2) || '#facc15';
      const split = colorState && typeof colorState.gradSplit === 'number'
        ? Math.max(0, Math.min(100, Math.round(colorState.gradSplit)))
        : 50;

      const blend = colorState && typeof colorState.gradBlend === 'number'
        ? Math.max(0, Math.min(50, Math.round(colorState.gradBlend)))
        : 0;

      const c1 = colorToRgbaWithControls(hex1, opacity, desat);
      const c2 = colorToRgbaWithControls(hex2, opacity, desat);

      const grad = buildBorderGradientCss(c1, c2, split, blend);

      targets.forEach((el, idx) => {
        if (!(el instanceof HTMLElement)) return;

        el.style.borderColor = 'transparent';
        el.style.borderImageSource = grad;
        el.style.borderImageSlice = 1;
        el.style.borderImageRepeat = 'stretch';

        dbgBorderState('COLOR gradient[' + idx + ']', el, idx);
      });

      bwLog(
        '[border-widget] applyBorderColorToTargets: gradient',
        hex1, '→', hex2,
        'split', split, '%',
        'blend', blend, '% для', targets.length, 'елементів'
      );
      return;
    }

  }




  // --- СИНХРОНІЗАЦІЯ КНОПОК "Рамка" ЗІ СТИЛЕМ ВИДІЛЕНОГО ЕЛЕМЕНТА ---
   // --- СИНХРОНІЗАЦІЯ КНОПОК "Рамка" ЗІ СТИЛЕМ ВИДІЛЕНОГО ЕЛЕМЕНТА ---
 function syncBorderLinesFromSelection() {
  if (!borderLinesController || typeof borderLinesController.setStateFromHost !== 'function') {
    return;
  }








  const targets = getBorderTargets();
  if (!targets.length) {
    const emptyState = { mode: 'none', preset: 'none', sides: 'all' };
    borderLinesState = emptyState;
    borderLinesController.setStateFromHost(emptyState);
    bwLog('[border-widget] syncBorderLinesFromSelection: немає таргетів, скинули стан');
    return;
  }

  // Допоміжна функція: читаємо товщину і сторони з одного елемента
  function readBorderFromElement(el) {
    const cs = getComputedStyle(el);

    const wTop    = parseFloat(cs.borderTopWidth)    || 0;
    const wRight  = parseFloat(cs.borderRightWidth)  || 0;
    const wBottom = parseFloat(cs.borderBottomWidth) || 0;
    const wLeft   = parseFloat(cs.borderLeftWidth)   || 0;

    const maxW = Math.max(wTop, wRight, wBottom, wLeft);

    let hasAnyBorder = maxW > 0.1;
    if (el.classList.contains('st-border-off')) {
      hasAnyBorder = false;
    }

    // Якщо рамки немає — одразу повертаємо
    if (!hasAnyBorder) {
      return {
        hasAnyBorder: false,
        preset: 'none',
        sides: 'all',
        maxW: 0
      };
    }

    // Пресет за товщиною (синхронно з widthMap: 1 / 3 / 5 px)
    let preset;
    if (maxW < 2) {
      preset = 'thin';
    } else if (maxW < 4) {
      preset = 'medium';
    } else if (maxW < 6) {
      preset = 'thick';
    } else {
      preset = 'custom';
    }

    // Сторони
    const t = wTop    > 0.1;
    const r = wRight  > 0.1;
    const b = wBottom > 0.1;
    const l = wLeft   > 0.1;

    let sides = 'all';
    if (t && r && b && l) {
      sides = 'all';
    } else if (t && b && !l && !r) {
      sides = 'tb';
    } else if (l && r && !t && !b) {
      sides = 'lr';
    } else if (t && !r && !b && !l) {
      sides = 'top';
    } else if (b && !t && !r && !l) {
      sides = 'bottom';
    } else if (l && !t && !r && !b) {
      sides = 'left';
    } else if (r && !t && !l && !b) {
      sides = 'right';
    } else {
      // комбіновані сторони — залишаємо 'all', користувач може задати явно
      sides = 'all';
    }

    return {
      hasAnyBorder: true,
      preset,
      sides,
      maxW
    };
  }

  // Зчитуємо стани для всіх таргетів
  const readings = targets.map(readBorderFromElement);

  const anyBorder = readings.some(r => r.hasAnyBorder);
  const allNoBorder = readings.every(r => !r.hasAnyBorder);

  const next = { ...borderLinesState };

  if (!anyBorder || allNoBorder) {
    // Ніхто не має рамки → повністю вимикаємо
    next.mode = 'none';
    next.preset = 'none';
    next.sides = 'all';
  } else {
    next.mode = 'on';

    // Пресет: якщо всі з однаковою товщиною → той пресет; інакше → "мішані"
    const firstPreset = readings.find(r => r.hasAnyBorder)?.preset || 'none';
    const isMixedPreset = readings.some(r => r.hasAnyBorder && r.preset !== firstPreset);

    if (isMixedPreset) {
      next.preset = 'mixed';
    } else {
      next.preset = firstPreset;
    }

    // Сторони поки беремо з першого елемента з рамкою
    const firstWithBorder = readings.find(r => r.hasAnyBorder);
    next.sides = firstWithBorder ? firstWithBorder.sides : 'all';
  }

  borderLinesState = next;
  bwLog('[border-widget] syncBorderLinesFromSelection →', next);
  borderLinesController.setStateFromHost(next);
}

  function syncBorderRadiusFromSelection() {
    if (!borderRadiusController || typeof borderRadiusController.setStateFromHost !== 'function') {
      return;
    }

    const targets = getBorderTargets();
    if (!targets.length) {
      const empty = {
        radius: 0,
        corners: { tl: true, tr: true, br: true, bl: true },
        preset: 'custom'
      };
      borderRadiusState = empty;
      borderRadiusController.setStateFromHost(empty);
      bwLog('[border-widget] syncBorderRadiusFromSelection: немає таргетів, скинули стан');
      return;
    }

    const el = targets[0];
    if (!(el instanceof HTMLElement)) return;

    const cs = getComputedStyle(el);
    const tl = parseFloat(cs.borderTopLeftRadius)    || 0;
    const tr = parseFloat(cs.borderTopRightRadius)   || 0;
    const br = parseFloat(cs.borderBottomRightRadius)|| 0;
    const bl = parseFloat(cs.borderBottomLeftRadius) || 0;

    const allEqual =
      Math.abs(tl - tr) < 0.5 &&
      Math.abs(tl - br) < 0.5 &&
      Math.abs(tl - bl) < 0.5;

    const nextRadius = allEqual ? tl : tl;

    const next = {
      radius: nextRadius,
      corners: {
        tl: true,
        tr: true,
        br: true,
        bl: true
      },
      preset: 'custom'
    };

    borderRadiusState = next;
    bwLog('[border-widget] syncBorderRadiusFromSelection →', next);
    borderRadiusController.setStateFromHost(next);
  }

function syncBorderStyleFromSelection() {
  if (!borderStyleController || typeof borderStyleController.setStateFromHost !== 'function') {
    return;
  }

  const targets = getBorderTargets();
  if (!targets.length) {
    const empty = { style: 'solid' };
    borderStyleState = empty;
    borderStyleController.setStateFromHost(empty);
    bwLog('[border-widget] syncBorderStyleFromSelection: немає таргетів, скинули стиль');
    return;
  }

  const el = targets[0];
  if (!(el instanceof HTMLElement)) return;

  let nextStyle = 'solid';

  // 1) Якщо є один із декоративних класів — вважаємо, що це він
  const decorMatch = DECOR_STYLES.find(d => d.className && el.classList.contains(d.className));
  if (decorMatch) {
    nextStyle = decorMatch.id;
  } else {
    // 2) Якщо є користувацький border-image (дуже грубо)
    const cs = getComputedStyle(el);
    const borderImage = cs.borderImageSource || cs['border-image-source'];
    const hasUserImage = borderImage && borderImage !== 'none';

    if (hasUserImage) {
      const user = USER_IMAGE_STYLES[0];
      if (user) {
        nextStyle = user.id;
      } else {
        nextStyle = 'solid';
      }
    } else {
      // 3) Стандартний border-style
      const cssStyle = cs.borderStyle || cs['border-style'] || 'solid';
      const allowed = BASE_STYLES.map(x => x.id);
      if (allowed.includes(cssStyle)) {
        nextStyle = cssStyle;
      } else {
        nextStyle = 'solid';
      }
    }
  }

  const next = { style: nextStyle };
  borderStyleState = next;
  borderStyleController.setStateFromHost(next);
  bwLog('[border-widget] syncBorderStyleFromSelection →', next);
}



  // --- РОЗМІТКА ВІДЖЕТА ---
  sectionEl.innerHTML = `
    <button class="design-section__header" type="button">
      <div class="design-section__header-title">
        <span>Лінії</span>
        <span class="design-section__header-subtitle">
         
        </span>
      </div>
      <span class="design-section__chevron">▶</span>
    </button>

    <div class="design-section__body">
      <!-- РЕЖИМ ВИБОРУ ЕЛЕМЕНТІВ -->
      <div class="design-field">
        <div class="design-field__label">Режим вибору елементів</div>
        <div class="design-border-target-summary" data-border="summary">
          Режим "Нічого": використовуємо звичайне виділення (Canvas / Дерево, Ctrl).
        </div>
        <p class="design-subnote">
          Режим вибору задається у верхній панелі інспектора
          (Нічого / Блоки / Секції). Бордер буде застосовано до
          елементів згідно з обраним режимом.
        </p>
      </div>

      <!-- МЕЖІ (гіди) -->
      <div class="design-field">
        <div class="design-field__label">Межі елементів</div>
        <div class="design-borders-guides-row" data-border-guides>
          <label class="design-border-flag">
            <input type="checkbox" data-border-guide="sections" />
            <span>Секції</span>
          </label>
          <label class="design-border-flag">
            <input type="checkbox" data-border-guide="containers" />
            <span>Контейнери</span>
          </label>
          <label class="design-border-flag">
            <input type="checkbox" data-border-guide="blocks" />
            <span>Блоки</span>
          </label>
        </div>
        <p class="design-subnote">
          Показує пунктирні межі секцій, блоків-контейнерів та звичайних блоків.
          Це лише допоміжна сітка, вона не впливає на реальний бордер.
        </p>
      </div>

      <!-- ПІД-АКОРДЕОНИ НАЛАШТУВАНЬ БОРДЕРА -->

      <div class="design-border-subsections">

        <!-- РАМКА -->
        <div class="design-border-subsection" data-border-subsection-id="line">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">Рамка</span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <div data-border-lines-root></div>
            
            <div class="design-field">
              <div class="design-field__label">Власна товщина</div>
              
              <div class="custom-thickness-wrap">
                <input type="range" min="1" max="100" value="1" class="custom-thickness-range" data-border-thickness-range>
                <input type="number" min="1" max="100" value="1" class="custom-thickness-input" data-border-thickness-input>
              </div>

              <button type="button" class="design-pill" data-border-thickness-reset>
                Скинути до стандартних
              </button>
            </div>



          </div>
        </div>

              <!-- КОЛІР рамки -->
                      <div class="design-border-subsection" data-border-subsection-id="glow">
                        <button class="design-border-subheader" type="button">
                          <span class="design-border-subheader-title">Колір</span>
                          <span class="design-border-subheader-chevron">▶</span>
                        </button>
                        <div class="design-border-subbody">
                          <div data-border-color-root></div>
                        </div>
                      </div>


            <!-- СТИЛЬ ЛІНІЇ -->
          <div class="design-border-subsection" data-border-subsection-id="style">
            <button class="design-border-subheader" type="button">
              <span class="design-border-subheader-title">Стиль</span>
              <span class="design-border-subheader-chevron">▶</span>
            </button>
            <div class="design-border-subbody">
              <div data-border-style-root></div>
            </div>
          </div>






        <!-- РАДІУСИ -->
        <div class="design-border-subsection" data-border-subsection-id="radius">
          <button class="design-border-subheader" type="button">
            <span class="design-border-subheader-title">Радіуси</span>
            <span class="design-border-subheader-chevron">▶</span>
          </button>
          <div class="design-border-subbody">
            <div data-border-radius-root></div>
          </div>
        </div>

        

       

      </div>

      <div class="design-field">
        <div class="design-border-apply-row">
          <button type="button" class="design-button" data-border="apply">
            Застосувати бордер
          </button>
          <span class="design-border-apply-note">
            Поки що це тільки каркас. Логіку застосування додамо на наступному етапі.
          </span>
        </div>
      </div>
    </div>
  `;

  // --- ВЛАСНА ТОВЩИНА (слайдер + інпут + скидання) ---
  const thicknessRangeEl = sectionEl.querySelector('[data-border-thickness-range]');
  const thicknessInputEl = sectionEl.querySelector('[data-border-thickness-input]');
  const thicknessResetBtn = sectionEl.querySelector('[data-border-thickness-reset]');

  function applyCustomThickness(px) {
    const targets = getBorderTargets();
    if (!targets.length) return;

    const safePx = Math.max(1, Math.min(100, Math.round(px || 1)));
    const pxStr = safePx + 'px';

    targets.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.borderWidth = pxStr;
    });

    // фіксуємо стан
    borderLinesState.mode = 'on';
    borderLinesState.preset = 'custom';
    borderLinesState.customValue = safePx;

    bwLog('[border-widget] custom thickness applied:', safePx, 'px для', targets.length, 'елементів');
  }

  if (thicknessRangeEl && thicknessInputEl) {
    thicknessRangeEl.addEventListener('input', () => {
      const px = Number(thicknessRangeEl.value) || 1;
      thicknessInputEl.value = px;
      applyCustomThickness(px);
    });

    thicknessInputEl.addEventListener('input', () => {
      let px = Number(thicknessInputEl.value) || 1;
      if (px < 1) px = 1;
      if (px > 100) px = 100;
      thicknessInputEl.value = px;
      thicknessRangeEl.value = px;
      applyCustomThickness(px);
    });
  }

  if (thicknessResetBtn) {
    thicknessResetBtn.addEventListener('click', () => {
      // повертаємо логіку товщини до пресетів (тонка/середня/товста)
      borderLinesState.preset = 'thin';
      borderLinesState.customValue = null;

      const targets = getBorderTargets();
      targets.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.style.removeProperty('border-width');
      });

      // синхронізуємо UI назад з елементів
      syncBorderLinesFromSelection();

      bwLog('[border-widget] custom thickness reset');
    });
  }






  // --- Акордеон секції "Бордер" (верхній) ---
  const headerBtn = sectionEl.querySelector('.design-section__header');
  if (headerBtn) {
    headerBtn.addEventListener('click', function () {
      sectionEl.classList.toggle('is-open');
    });
  }

  const summaryEl = sectionEl.querySelector('[data-border="summary"]');

  // ---- МЕЖІ (гіди) ----
  const builderRoot = document.getElementById('builder-root');
  const guidesInputs = Array.from(
    sectionEl.querySelectorAll('input[data-border-guide]')
  );

  const guidesState = {
    sections: false,
    containers: false,
    blocks: false
  };

  function markBlockGuideKinds() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) return;
    const blocks = Array.from(siteRoot.querySelectorAll('.st-block'));
    blocks.forEach((block) => {
      block.classList.remove('st-block--guide-container', 'st-block--guide-leaf');
      const hasInnerBlock = block.querySelector('.st-block');
      if (hasInnerBlock) {
        block.classList.add('st-block--guide-container');
      } else {
        block.classList.add('st-block--guide-leaf');
      }
    });
  }

  function applyGuidesState() {
    if (!builderRoot) return;

    builderRoot.classList.toggle(
      'builder--guides-sections',
      !!guidesState.sections
    );
    builderRoot.classList.toggle(
      'builder--guides-containers',
      !!guidesState.containers
    );
    builderRoot.classList.toggle(
      'builder--guides-blocks',
      !!guidesState.blocks
    );

    if (guidesState.containers || guidesState.blocks) {
      markBlockGuideKinds();
    }
  }

  guidesInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const type = input.getAttribute('data-border-guide');
      if (!type) return;
      guidesState[type] = input.checked;
      applyGuidesState();
    });
  });

  // ---- допоміжні: отримати цілі / симулювати клік / авто-вибір ----

  function getBorderTargets() {
    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) {
      bwLog('site-root not found');
      return [];
    }

    // режим "Блоки" – беремо всі .st-block
    if (targetMode === 'blocks') {
      const blocks = Array.from(siteRoot.querySelectorAll('.st-block'));
      bwLog('getBorderTargets: режим blocks, знайдено блоків =', blocks.length);
      return blocks;
    }

    // режим "Секції" – беремо всі .st-section
    if (targetMode === 'sections') {
      const sections = Array.from(siteRoot.querySelectorAll('.st-section'));
      bwLog('getBorderTargets: режим sections, знайдено секцій =', sections.length);
      return sections;
    }

    // режим "Нічого" – беремо те, що вже виділено конструктором
    if (typeof getSelection === 'function') {
      const sel = getSelection();
      if (sel && Array.isArray(sel.elements)) {
        bwLog(
          'getBorderTargets: режим none, з getSelection() елементів =',
          sel.elements.length
        );
        return sel.elements;
      }
      bwLog('getBorderTargets: режим none, getSelection() порожній або некоректний:', sel);
    }

    return [];
  }

  function updateTargetSummaryText() {
    if (!summaryEl) return;

    const targets = getBorderTargets();
    const count = targets.length;

    if (targetMode === 'none') {
      if (!count) {
        summaryEl.textContent =
          'Режим "Нічого": елементи не вибрані. Виділи блоки/секції в конструкторі або в Дереві.';
      } else if (count === 1) {
        summaryEl.textContent =
          'Режим "Нічого": 1 елемент у поточному виділенні (Canvas / Дерево).';
      } else {
        summaryEl.textContent =
          'Режим "Нічого": ' +
          count +
          ' елементи(ів) у поточному виділенні.';
      }
      return;
    }

    if (targetMode === 'blocks') {
      if (!count) {
        summaryEl.textContent =
          'Режим "Блоки": блоків на сторінці ще немає.';
      } else {
        summaryEl.textContent =
          'Режим "Блоки": буде застосовано до всіх ' +
          count +
          ' блоків.';
      }
      return;
    }

    if (targetMode === 'sections') {
      if (!count) {
        summaryEl.textContent =
          'Режим "Секції": секцій на сторінці ще немає.';
      } else {
        summaryEl.textContent =
          'Режим "Секції": буде застосовано до всіх ' +
          count +
          ' секцій.';
      }
      return;
    }
  }

  // Симуляція кліку по елементу полотна
  function simulateCanvasClick(el, withCtrl) {
    if (!el) return;

    const label =
      el.getAttribute('data-block-id') ||
      el.getAttribute('data-section-id') ||
      el.id ||
      el.className;

    bwLog(
      'simulateCanvasClick:',
      'ctrl=', !!withCtrl,
      'target=',
      label
    );

    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      ctrlKey: !!withCtrl,
      metaKey: !!withCtrl
    });
    el.dispatchEvent(evt);

    syncBorderLinesFromSelection();
  }

  // Відкрити дерево сторінки, якщо воно згорнуте
  function ensurePageTreeVisible() {
    const wrap = document.getElementById('page-tree-wrap');
    const toggleBtn = document.getElementById('toggle-page-tree');

    if (!wrap || !toggleBtn) return;

    const display = window.getComputedStyle(wrap).display;
    if (display === 'none') {
      toggleBtn.click();
    }
  }

  // Автоматичний вибір залежно від режиму
  function applyAutoSelectionForMode() {
    bwLog('applyAutoSelectionForMode: режим =', targetMode);

    if (targetMode === 'none') {
      updateTargetSummaryText();
      syncBorderLinesFromSelection();
      return;
    }

    ensurePageTreeVisible();

    const siteRoot = document.getElementById('site-root');
    if (!siteRoot) {
      bwLog('site-root не знайдено в applyAutoSelectionForMode');
      updateTargetSummaryText();
      syncBorderLinesFromSelection();
      return;
    }

    if (targetMode === 'blocks') {
      const blocks = Array.from(siteRoot.querySelectorAll('.st-block'));
      bwLog('режим blocks: знайдено блоків:', blocks.length);
      if (!blocks.length) {
        updateTargetSummaryText();
        syncBorderLinesFromSelection();
        return;
      }

      simulateCanvasClick(blocks[0], false);
      for (let i = 1; i < blocks.length; i++) {
        simulateCanvasClick(blocks[i], true);
      }

      updateTargetSummaryText();
      syncBorderLinesFromSelection();
      return;
    }

    if (targetMode === 'sections') {
      const sections = Array.from(siteRoot.querySelectorAll('.st-section'));
      bwLog('режим sections: знайдено секцій:', sections.length);
      if (!sections.length) {
        updateTargetSummaryText();
        syncBorderLinesFromSelection();
        return;
      }

      simulateCanvasClick(sections[0], false);
      for (let i = 1; i < sections.length; i++) {
        simulateCanvasClick(sections[i], true);
      }

      updateTargetSummaryText();
      syncBorderLinesFromSelection();
      return;
    }

    updateTargetSummaryText();
    syncBorderLinesFromSelection();
  }

  // --- ВНУТРІШНІ АКОРДЕОНИ (Рамка / Радіуси / Тіні / Підсвічування) ---

  const subsections = Array.from(
    sectionEl.querySelectorAll('.design-border-subsection')
  );
  let subState = loadBorderSubsectionsState();
  const hasStoredState = subState && Object.keys(subState).length > 0;

  subsections.forEach(function (sub, index) {
    const existingId = sub.getAttribute('data-border-subsection-id');
    const id = existingId || ('sec-' + (index + 1));
    sub.setAttribute('data-border-subsection-id', id);

    let isOpen;
    if (hasStoredState && Object.prototype.hasOwnProperty.call(subState, id)) {
      isOpen = !!subState[id];
    } else {
      isOpen = id === 'line';
    }

    const header = sub.querySelector('.design-border-subheader');
    const body = sub.querySelector('.design-border-subbody');
    const chevron = sub.querySelector('.design-border-subheader-chevron');

    function applyOpenState(open) {
      sub.classList.toggle('is-open', open);
      if (body) body.hidden = !open;
      if (chevron) chevron.textContent = open ? '▼' : '▶';
    }

    applyOpenState(isOpen);

    if (header && !header.dataset.borderSubBound) {
      header.dataset.borderSubBound = '1';
      header.addEventListener('click', function () {
        const currentlyOpen = sub.classList.contains('is-open');
        const nextState = !currentlyOpen;
        applyOpenState(nextState);

        subState = subState || {};
        subState[id] = nextState;
        saveBorderSubsectionsState(subState);
      });
    }
  });

  // --- СЛІДКУЄМО ЗА ЗМІНАМИ ВИДІЛЕННЯ, коли targetMode = 'none' ---
  const siteRoot = document.getElementById('site-root');
  if (siteRoot) {
    const mo = new MutationObserver(function (mutations) {
      if (targetMode !== 'none') return;
      let need = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const t = m.target;
          if (t instanceof HTMLElement) {
            if (
              t.classList.contains('is-active') ||
              t.classList.contains('is-selected')
            ) {
              need = true;
              break;
            }
          }
        }
      }
        if (need) {
      setTimeout(() => {
        updateTargetSummaryText();
        syncBorderLinesFromSelection();
        syncBorderRadiusFromSelection();
        syncBorderStyleFromSelection();
      }, 0);
   }


    });






    mo.observe(siteRoot, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class'],
      childList: true
    });
  }

  // --- Слухаємо глобальну подію режиму вибору ---
  window.addEventListener('st:designSelectionModeChange', function (ev) {
    const detail = ev && ev.detail ? ev.detail : {};
    const mode = detail.mode;
    if (!mode) return;
    bwLog('подія st:designSelectionModeChange, режим =', mode);
    targetMode = mode;
    applyAutoSelectionForMode();
  });

  // --- Слухаємо глобальну подію зміни кольору бордера ---
  window.addEventListener('st:borderColorChange', function (ev) {
    const detail = ev && ev.detail;
    if (!detail || !detail.state) return;
    applyBorderColorToTargets(detail.state);
  });






  // --- Кнопка "Застосувати" — поки що заглушка ---
  const applyBtn = sectionEl.querySelector('button[data-border="apply"]');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      const targets = getBorderTargets();
      console.log(
        '[border-widget] TODO: застосувати бордер до',
        targets.length,
        'елемент(ів)',
        { mode: targetMode, targets: targets }
      );
    });
  }

  host.appendChild(sectionEl);

  // ініціалізація підвіджетів (віджет у віджеті)
  const linesRoot = sectionEl.querySelector('[data-border-lines-root]');
  if (linesRoot) {
    borderLinesController = initBorderLinesWidget(linesRoot, {
      onChange(newState) {
        borderLinesState = newState;
        bwLog('[border-widget] lines onChange →', newState);
        applyBorderLinesToTargets();
      }
    });
  }

  const radiusRoot = sectionEl.querySelector('[data-border-radius-root]');
  if (radiusRoot) {
    borderRadiusController = initBorderRadiusWidget(radiusRoot, {
      onChange(newState) {
        borderRadiusState = newState;
        bwLog('[border-widget] radius onChange →', newState);
        applyBorderRadiusToTargets();
      }
    });
  }

      const styleRoot = sectionEl.querySelector('[data-border-style-root]');
    if (styleRoot) {
      borderStyleController = initBorderStyleWidget(styleRoot, {
        onChange(newState) {
          borderStyleState = newState;
          applyBorderStyleToTargets();
        }
      });
    }






  const shadowsRoot = sectionEl.querySelector('[data-border-shadows-root]');
  if (shadowsRoot) {
    initBorderShadowsWidget(shadowsRoot);
  }

  const colorRoot = sectionEl.querySelector('[data-border-color-root]');
  if (colorRoot) {
    initBorderColorWidget(colorRoot);
  }

  
 // первинне оновлення тексту + синхронізація з поточним виділенням
  updateTargetSummaryText();
  syncBorderLinesFromSelection();
  syncBorderRadiusFromSelection();
  syncBorderStyleFromSelection();
}