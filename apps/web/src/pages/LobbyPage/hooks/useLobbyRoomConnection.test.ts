import { describe, expect, it } from "vitest";
import { getLobbyRoomStateUpdateDecision } from "./useLobbyRoomConnection";

describe("getLobbyRoomStateUpdateDecision", () => {
  it("accepts state updates for the requested room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: false,
    });
  });

  it("navigates when an established lobby room is renamed by the host", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: true,
    });
  });

  it("ignores stale updates from a previous room after the player requested a new room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: false,
      shouldNavigateToRoom: false,
    });
  });
});
