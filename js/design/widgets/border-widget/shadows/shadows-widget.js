// js/design/widgets/border-widget/shadows/shadows-widget.js
// Підвіджет "Тіні" — поки заглушка.

export function initBorderShadowsWidget(host) {
  if (!host) return;

  host.innerHTML = `
    <div class="design-field">
      <p class="design-subnote">
        Тут будуть налаштування тіней (box-shadow: зсув, розмиття, розмах, прозорість, пресети).
      </p>
    </div>
  `;
}
