/**
 * Which tab of a segmented control is active, remembered on this device (localStorage, a convenience only).
 * Pure apart from the storage passed in, so tests can use a fake.
 */

/** localStorage, or null when blocked. */
export function deviceStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} ids tab ids in order (the first is the default)
 * @param {string} key storage key
 * @param {{getItem: Function, setItem: Function}|null} [store]
 * @returns {{active: () => string, select: (id: string) => number, restore: () => string}}
 *   select returns the slide direction (1 from the right, -1 from the left), or 0 when nothing changed
 */
export function tabState(ids, key, store = deviceStorage()) {
  const read = () => {
    try {
      const v = store && store.getItem(key);
      return ids.includes(v) ? v : ids[0];
    } catch {
      return ids[0];
    }
  };
  let active = read();
  return {
    active: () => active,
    select(id) {
      if (!ids.includes(id) || id === active) return 0;
      const dir = Math.sign(ids.indexOf(id) - ids.indexOf(active));
      active = id;
      try {
        if (store) store.setItem(key, id);
      } catch {
        // blocked storage: the tab just isn't remembered
      }
      return dir;
    },
    restore: () => (active = read()),
  };
}
