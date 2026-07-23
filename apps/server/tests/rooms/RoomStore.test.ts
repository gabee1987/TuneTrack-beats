import { describe, expect, it } from "vitest";
import { RoomStore } from "../../src/rooms/RoomStore.js";

describe("RoomStore socket membership session helpers", () => {
  it("reports whether any socket still holds a session", () => {
    const store = new RoomStore();
    store.setSocketMembership("socket-a", {
      playerId: "player-1",
      roomId: "room-1",
      sessionId: "session-1",
    });

    expect(store.hasSocketMembershipForSession("session-1")).toBe(true);
    expect(store.hasSocketMembershipForSession("session-unknown")).toBe(false);

    store.deleteSocketMembership("socket-a");
    expect(store.hasSocketMembershipForSession("session-1")).toBe(false);
  });

  it("clears other sockets for a session while keeping the active one", () => {
    const store = new RoomStore();
    store.setSocketMembership("stale-socket", {
      playerId: "player-1",
      roomId: "room-1",
      sessionId: "session-1",
    });
    store.setSocketMembership("other-session-socket", {
      playerId: "player-2",
      roomId: "room-1",
      sessionId: "session-2",
    });

    store.clearOtherSocketMembershipsForSession("session-1", "fresh-socket");

    expect(store.getSocketMembership("stale-socket")).toBeUndefined();
    expect(store.getSocketMembership("other-session-socket")).toBeDefined();
  });

  it("does not remove the socket flagged as the one to keep", () => {
    const store = new RoomStore();
    store.setSocketMembership("keep-socket", {
      playerId: "player-1",
      roomId: "room-1",
      sessionId: "session-1",
    });

    store.clearOtherSocketMembershipsForSession("session-1", "keep-socket");

    expect(store.getSocketMembership("keep-socket")).toBeDefined();
  });

  it("removes every socket tied to a session", () => {
    const store = new RoomStore();
    store.setSocketMembership("socket-a", {
      playerId: "player-1",
      roomId: "room-1",
      sessionId: "session-1",
    });
    store.setSocketMembership("socket-b", {
      playerId: "player-1",
      roomId: "room-1",
      sessionId: "session-1",
    });
    store.setSocketMembership("socket-c", {
      playerId: "player-2",
      roomId: "room-1",
      sessionId: "session-2",
    });

    store.deleteSocketMembershipsForSession("session-1");

    expect(store.getSocketMembership("socket-a")).toBeUndefined();
    expect(store.getSocketMembership("socket-b")).toBeUndefined();
    expect(store.getSocketMembership("socket-c")).toBeDefined();
  });
});
