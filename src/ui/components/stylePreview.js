/** Small preview drawing used on each style card (colours come from CSS variables). */
export const PREVIEW_SVG =
  '<svg class="prev" viewBox="0 0 120 72" aria-hidden="true">' +
  '<rect width="120" height="72" rx="10" fill="var(--board-bg)"/>' +
  '<circle cx="24" cy="18" r="2" fill="var(--dot)"/><circle cx="96" cy="54" r="2" fill="var(--dot)"/>' +
  '<path d="M22 56V36h40V22h22" fill="none" stroke="var(--arrow)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M84 13l12 9-12 9z" fill="var(--arrow)" stroke="var(--arrow)" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M48 56h30" fill="none" stroke="var(--arrow)" stroke-width="6" stroke-linecap="round"/>' +
  '<path d="M48 49l-10 7 10 7z" fill="var(--arrow)" stroke="var(--arrow)" stroke-width="3" stroke-linejoin="round"/>' +
  '</svg>';
