// js/design/widgets/border-widget/border-style/presets.js
// Опис усіх стилів бордера для віджета "Стилі" + заготовка під кастомні стилі.

export const BASE_STYLES = [
  { id: 'solid',  label: 'Суцільна',   css: true },
  { id: 'dashed', label: 'Штрихова',   css: true },
  { id: 'dotted', label: 'Крапки',     css: true },
  { id: 'double', label: 'Подвійна',   css: true },
  { id: 'groove', label: 'Втиснута',   css: true },
  { id: 'ridge',  label: 'Опукла',     css: true },
  { id: 'inset',  label: 'Внутрішня',  css: true },
  { id: 'outset', label: 'Зовнішня',   css: true }
];

// Декоративні стилі — реалізуються через класи (border-image / псевдоелементи)
export const DECOR_STYLES = [
  { id: 'wavy',      label: 'Хвиляста',       css: false, className: 'st-border-wavy' },
  { id: 'dashdot',   label: 'Штрих+крапка',   css: false, className: 'st-border-dashdot' },
  { id: 'big-dots',  label: 'Великі крапки',  css: false, className: 'st-border-big-dots' },
  { id: 'star-line', label: 'Зірочки',        css: false, className: 'st-border-star-line' }
];

// Майбутні стилі з власними картинками користувача (border-image)
export const USER_IMAGE_STYLES = [
  // Приклад у майбутньому:
  // {
  //   id: 'user-stars-1',
  //   label: 'Мої зірочки',
  //   imgUrl: '/user-assets/borders/user-stars-1.svg'
  // }
];

export function getAllBorderStyles() {
  return [
    ...BASE_STYLES,
    ...DECOR_STYLES,
    ...USER_IMAGE_STYLES
  ];
}
