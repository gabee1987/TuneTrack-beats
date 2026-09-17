import { describe, expect, it } from "vitest";
import { createRoomPayloadSchema } from "./schemas.js";

describe("createRoomPayloadSchema", () => {
  it("accepts server-generated creation without a room id", () => {
    expect(
      createRoomPayloadSchema.parse({
        displayName: "Player One",
        sessionId: "TEST_SESSION_1",
      }),
    ).toEqual({
      displayName: "Player One",
      sessionId: "TEST_SESSION_1",
    });
  });

  it("continues accepting a valid custom room id", () => {
    expect(
      createRoomPayloadSchema.parse({
        displayName: "Player One",
        roomId: "custom-room",
        sessionId: "TEST_SESSION_1",
      }).roomId,
    ).toBe("custom-room");
  });
});
