/**
 * Desktop web (3.28.0): Escape closes the top popup or sheet, like the Android back button does for popups.
 * Screens are not changed and the exit dialog is not opened; typing in a text field keeps Escape for itself.
 * @param {{key: string, target?: {tagName?: string}|null, defaultPrevented?: boolean, preventDefault: () => void}} e
 * @param {() => boolean} back closes the top popup; false when none is open (modalBack)
 * @returns {boolean} true when a popup was closed
 */
export function escapeKey(e, back) {
  if (e.key !== 'Escape' || e.defaultPrevented) return false;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  if (!back()) return false;
  e.preventDefault();
  return true;
}
