function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns `next`, but with every subtree that is deep-equal to the same subtree of
 * `previous` replaced by the previous reference. Each `state_update` parses a fresh room
 * state, so without this every memo keyed on a timeline, card or player list misses even
 * when only one token count changed (05 §2.2). Neither argument is mutated.
 */
export function reuseUnchangedReferences<T>(previous: unknown, next: T): T {
  if (Object.is(previous, next)) {
    return next;
  }

  if (Array.isArray(next)) {
    if (!Array.isArray(previous)) {
      return next;
    }
    let isUnchanged = previous.length === next.length;
    const shared = next.map((item: unknown, index) => {
      const sharedItem = reuseUnchangedReferences(previous[index], item);
      if (sharedItem !== previous[index]) {
        isUnchanged = false;
      }
      return sharedItem;
    });
    return (isUnchanged ? previous : shared) as T;
  }

  if (isPlainObject(next)) {
    if (!isPlainObject(previous)) {
      return next;
    }
    const keys = Object.keys(next);
    let isUnchanged = keys.length === Object.keys(previous).length;
    const shared: Record<string, unknown> = {};
    for (const key of keys) {
      const sharedValue = reuseUnchangedReferences(previous[key], next[key]);
      if (sharedValue !== previous[key] || !(key in previous)) {
        isUnchanged = false;
      }
      shared[key] = sharedValue;
    }
    return (isUnchanged ? previous : shared) as T;
  }

  return next;
}
