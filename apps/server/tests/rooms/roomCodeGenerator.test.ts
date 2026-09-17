import { describe, expect, it } from "vitest";
import { generateUniqueRoomCode } from "../../src/rooms/roomCodeGenerator.js";

describe("generateUniqueRoomCode", () => {
  it("creates a short friendly code when the first candidate is available", () => {
    const randomValues = [0, 1, 42];
    const roomCode = generateUniqueRoomCode(
      () => false,
      () => randomValues.shift() ?? 0,
    );

    expect(roomCode).toMatch(/^[a-z]{3,4}-[a-z]{3,4}-\d{2}$/);
    expect(roomCode.length).toBeLessThanOrEqual(12);
  });

  it("retries friendly collisions five times then advances from a colliding base32 fallback", () => {
    const randomValues = [...Array.from({ length: 15 }, () => 0), 0];
    const roomCode = generateUniqueRoomCode(
      (candidate) => candidate.includes("-") || candidate === "222222",
      () => randomValues.shift() ?? 0,
    );

    expect(roomCode).toBe("222223");
  });
});
