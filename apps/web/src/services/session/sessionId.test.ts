import { describe, expect, it } from "vitest";
import { createSessionId } from "./sessionId";

describe("sessionId", () => {
  it("uses randomUUID when available", () => {
    const cryptoObject = {
      randomUUID: () => "uuid-from-randomuuid",
    };

    expect(createSessionId(cryptoObject)).toBe("uuid-from-randomuuid");
  });

  it("builds an RFC4122-like id from getRandomValues when randomUUID is unavailable", () => {
    const cryptoObject = {
      getRandomValues: (values: Uint8Array) => {
        values.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        return values;
      },
    };

    expect(createSessionId(cryptoObject)).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  it("returns a string fallback even without crypto support", () => {
    expect(createSessionId(undefined)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
