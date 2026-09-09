/**
 * Deterministic ids so request ids, session ids and playlist ids are assertable.
 * jsdom ships `crypto.getRandomValues` but not `crypto.randomUUID`.
 */

let counter = 0;

function nextUuid(): string {
  counter += 1;
  const suffix = counter.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

export function resetSequentialUuid(): void {
  counter = 0;

  if (typeof globalThis.crypto === "undefined") {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      writable: true,
      value: {},
    });
  }

  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    writable: true,
    value: nextUuid,
  });

  if (typeof globalThis.crypto.getRandomValues !== "function") {
    Object.defineProperty(globalThis.crypto, "getRandomValues", {
      configurable: true,
      writable: true,
      value: <T extends ArrayBufferView | null>(array: T): T => {
        if (array instanceof Uint8Array) {
          for (let index = 0; index < array.length; index += 1) {
            array[index] = index;
          }
        }
        return array;
      },
    });
  }
}

/** The nth id `resetSequentialUuid` will hand out, for assertions. */
export function expectedUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, "0")}`;
}
