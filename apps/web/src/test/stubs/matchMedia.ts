type MediaQueryListener = (event: MediaQueryListEvent) => void;

interface StubMediaQueryList extends Omit<MediaQueryList, "matches"> {
  matches: boolean;
  __listeners: Set<MediaQueryListener>;
}

const matchers = new Map<string, boolean>();
const lists = new Map<string, StubMediaQueryList>();

function evaluate(query: string): boolean {
  return matchers.get(query) ?? false;
}

function createList(query: string): StubMediaQueryList {
  const listeners = new Set<MediaQueryListener>();

  const list = {
    __listeners: listeners,
    matches: evaluate(query),
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MediaQueryListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: MediaQueryListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  } as unknown as StubMediaQueryList;

  return list;
}

export function installMatchMedia(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.matchMedia = ((query: string) => {
    const existing = lists.get(query);
    if (existing) {
      existing.matches = evaluate(query);
      return existing;
    }

    const list = createList(query);
    lists.set(query, list);
    return list;
  }) as typeof window.matchMedia;
}

/**
 * Set whether a media query matches, and notify anything already subscribed to it.
 * Pass the exact query string the component uses, e.g. `(pointer: coarse)`.
 */
export function setMediaQuery(query: string, matches: boolean): void {
  matchers.set(query, matches);

  const list = lists.get(query);
  if (!list) {
    return;
  }

  list.matches = matches;
  const event = { matches, media: query } as MediaQueryListEvent;
  for (const listener of list.__listeners) {
    listener(event);
  }
}

export function resetMatchMedia(): void {
  matchers.clear();
  lists.clear();
}
