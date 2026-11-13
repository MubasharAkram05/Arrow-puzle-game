/**
 * Out of Hearts offer (3.26.0): the "Get +1 heart" card has two buttons, Watch Ad and diamonds. Pure: decides how
 * each one looks from what is available. Tested in tests/gameOverHeart.test.js.
 *
 *  ad:    'ready' (primary)  | 'unavailable' (no ad loaded or daily cap reached) | 'limit' (no refills left)
 *  gems:  'secondary' (outlined, next to a ready ad) | 'main' (filled, when the ad can't be used) | 'short'
 *  note:  the line under both buttons ('' when nothing needs saying)
 *
 * @param {{adReady: boolean, refillsLeft: number, missingDiamonds: number}} o
 * @returns {{ad: 'ready'|'unavailable'|'limit', gems: 'secondary'|'main'|'short', note: string}}
 */
export function heartOffer({ adReady, refillsLeft, missingDiamonds }) {
  const ad = refillsLeft <= 0 ? 'limit' : adReady ? 'ready' : 'unavailable';
  const short = missingDiamonds > 0;
  const gems = short ? 'short' : ad === 'ready' ? 'secondary' : 'main';
  const need = `Need ${missingDiamonds} more diamond${missingDiamonds === 1 ? '' : 's'}`;
  let note = '';
  if (short && ad === 'ready') note = need;
  else if (short) note = `${need}. No ad right now, tap Try Again.`;
  return { ad, gems, note };
}
