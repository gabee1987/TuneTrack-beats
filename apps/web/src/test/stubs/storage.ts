/**
 * Storage doubles for jsdom. jsdom does implement Storage, but it persists between test
 * files in the same worker and cannot be made to throw — and a throwing storage (private
 * window, blocked site data) is a real failure mode the app must survive.
 */

export class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  public get length(): number {
    return this.values.size;
  }

  public clear(): void {
    this.values.clear();
  }

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

export class ThrowingStorage implements Storage {
  public readonly length = 0;

  public clear(): never {
    throw new DOMException("storage is not available", "SecurityError");
  }

  public getItem(): never {
    throw new DOMException("storage is not available", "SecurityError");
  }

  public key(): never {
    throw new DOMException("storage is not available", "SecurityError");
  }

  public removeItem(): never {
    throw new DOMException("storage is not available", "SecurityError");
  }

  public setItem(): never {
    throw new DOMException("storage is not available", "SecurityError");
  }
}

function defineStorage(name: "localStorage" | "sessionStorage", storage: Storage): void {
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: storage,
  });
}

export function installStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  defineStorage("localStorage", new MemoryStorage());
  defineStorage("sessionStorage", new MemoryStorage());
}

export function resetStorage(): void {
  installStorage();
}

/** Make both storages throw on every access, to prove the app degrades rather than crashes. */
export function useThrowingStorage(): void {
  defineStorage("localStorage", new ThrowingStorage());
  defineStorage("sessionStorage", new ThrowingStorage());
}

export function seedLocalStorage(entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) {
    window.localStorage.setItem(key, value);
  }
}
