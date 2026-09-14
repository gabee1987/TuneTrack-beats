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

describe("RoomStore processed action acknowledgements", () => {
  it("keeps only the 32 most recently applied actions per room", () => {
    const store = new RoomStore();

    for (let index = 1; index <= 33; index += 1) {
      store.rememberProcessedActionAck("room-1", {
        ok: true,
        requestId: `request-${index}`,
      });
    }

    expect(store.getProcessedActionAck("room-1", "request-1")).toBeUndefined();
    expect(store.getProcessedActionAck("room-1", "request-2")).toEqual({
      ok: true,
      requestId: "request-2",
    });
    expect(store.getProcessedActionAck("other-room", "request-2")).toBeUndefined();
  });

  it("forgets processed actions when their room is deleted", () => {
    const store = new RoomStore();
    store.rememberProcessedActionAck("room-1", {
      ok: true,
      requestId: "request-1",
    });

    store.deleteRoom("room-1");

    expect(store.getProcessedActionAck("room-1", "request-1")).toBeUndefined();
  });
});
