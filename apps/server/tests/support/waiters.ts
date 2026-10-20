import {
  ServerToClientEvent,
  type PublicRoomState,
  type RoomListPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import type { Socket } from "socket.io-client";
import { afterEach } from "vitest";

/**
 * Every wait is bounded and names what it waited for, so a missing broadcast fails with that
 * name instead of the test timeout. A wait still pending when its test ends is dropped.
 */
const DEFAULT_WAIT_MS = 2_000;
const pendingWaits = new Set<() => void>();

afterEach(() => {
  pendingWaits.forEach((cancel) => cancel());
  pendingWaits.clear();
});

export function waitForMatchingEvent<TPayload>(
  socket: Socket,
  eventName: string,
  isTarget: (payload: TPayload) => boolean,
  description = eventName,
): Promise<TPayload> {
  return new Promise((resolve, reject) => {
    const settle = () => {
      clearTimeout(timer);
      socket.off(eventName, onEvent);
      pendingWaits.delete(settle);
    };
    const onEvent = (payload: TPayload) => {
      if (isTarget(payload)) {
        settle();
        resolve(payload);
      }
    };
    const timer = setTimeout(() => {
      settle();
      reject(new Error(`Timed out after ${DEFAULT_WAIT_MS} ms waiting for ${description}`));
    }, DEFAULT_WAIT_MS);

    pendingWaits.add(settle);
    socket.on(eventName, onEvent);
  });
}

export function nextEvent<TPayload>(socket: Socket, eventName: string): Promise<TPayload> {
  return waitForMatchingEvent<TPayload>(socket, eventName, () => true);
}

export async function waitForStateUpdate(
  socket: Socket,
  isTargetState: (roomState: PublicRoomState) => boolean,
): Promise<PublicRoomState> {
  const payload = await waitForMatchingEvent<StateUpdatePayload>(
    socket,
    ServerToClientEvent.StateUpdate,
    (update) => isTargetState(update.roomState),
    `a state_update matching ${isTargetState.toString()}`,
  );
  return payload.roomState;
}

export function waitForRoomList(
  socket: Socket,
  isTargetList: (payload: RoomListPayload) => boolean,
): Promise<RoomListPayload> {
  return waitForMatchingEvent(
    socket,
    ServerToClientEvent.RoomList,
    isTargetList,
    `a room_list matching ${isTargetList.toString()}`,
  );
}
