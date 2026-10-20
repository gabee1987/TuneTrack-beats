import type { PublicRoomState, RoomId } from "@tunetrack/shared";

/** Room lifecycle facts other layers react to; the rooms layer never knows who listens. */
export interface RoomEventMap {
  roomStateChanged: [roomState: PublicRoomState];
  roomDirectoryChanged: [];
  roomExpired: [roomId: RoomId];
  roomRenamed: [previousRoomId: RoomId, nextRoomId: RoomId];
  roomClosed: [roomId: RoomId];
  socketLeft: [socketId: string];
  spotifyPlaybackHandoff: [roomId: RoomId];
}

type RoomEventName = keyof RoomEventMap;
type RoomEventListener<TName extends RoomEventName> = (...args: RoomEventMap[TName]) => void;

export class RoomEvents {
  private readonly listeners = new Map<RoomEventName, Set<(...args: never[]) => void>>();

  public on<TName extends RoomEventName>(name: TName, listener: RoomEventListener<TName>): void {
    const listeners = this.listeners.get(name) ?? new Set();
    listeners.add(listener as (...args: never[]) => void);
    this.listeners.set(name, listeners);
  }

  public emit<TName extends RoomEventName>(name: TName, ...args: RoomEventMap[TName]): void {
    this.listeners.get(name)?.forEach((listener) => {
      (listener as RoomEventListener<TName>)(...args);
    });
  }
}
