import { ROOM_CODE_MAX_LENGTH } from "@tunetrack/shared";
import { describe, expect, it } from "vitest";
import { generateUniqueRoomCode } from "../../src/rooms/roomCodeGenerator.js";

describe("generateUniqueRoomCode", () => {
  it("creates one music word and two digits with nothing between them", () => {
    const randomValues = [0, 0, 7];
    const roomCode = generateUniqueRoomCode(
      () => false,
      () => randomValues.shift() ?? 0,
    );

    expect(roomCode).toBe("beat29");
  });

  it("never uses letters that move on a Hungarian keyboard or digits that read as letters", () => {
    for (let wordIndex = 0; wordIndex < 64; wordIndex += 1) {
      const randomValues = [wordIndex, 0, 7];
      const roomCode = generateUniqueRoomCode(
        () => false,
        (maxExclusive) => (randomValues.shift() ?? 0) % maxExclusive,
      );

      expect(roomCode).toMatch(/^[a-v]{3,5}[2-9]{2}$/);
      expect(roomCode).not.toMatch(/([a-z])\1/);
      expect(roomCode.length).toBeLessThanOrEqual(ROOM_CODE_MAX_LENGTH);
    }
  });

  it("retries friendly collisions five times then advances from a colliding base32 fallback", () => {
    const randomValues = [...Array.from({ length: 15 }, () => 0), 0];
    const roomCode = generateUniqueRoomCode(
      (candidate) => /^[a-z]+\d{2}$/.test(candidate) || candidate === "222222",
      () => randomValues.shift() ?? 0,
    );

    expect(roomCode).toBe("222223");
  });
});
