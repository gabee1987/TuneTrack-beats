import { GameFlowService, type GameTrackCard } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId } from "@tunetrack/shared";
import { RoomActionAcks } from "./RoomActionAcks.js";
import { RoomConnectionService } from "./RoomConnectionService.js";
import { RoomEvents } from "./RoomEvents.js";
import { RoomGameplayService } from "./RoomGameplayService.js";
import { RoomLobbyService } from "./RoomLobbyService.js";
import { RoomStore } from "./RoomStore.js";
import { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

/** Validated values from `app/env.ts`; the rooms layer has no defaults of its own. */
export interface RoomDurations {
  reconnectGracePeriodMs: number;
  hostTransferGracePeriodMs: number;
  turnSkipGracePeriodMs: number;
  allPlayersOfflineRoomTtlMs: number;
  maxActiveRoomCount: number;
}

export interface RoomCore {
  store: RoomStore;
  timers: RoomTimerCoordinator;
  events: RoomEvents;
  acks: RoomActionAcks;
  lobby: RoomLobbyService;
  gameplay: RoomGameplayService;
  connection: RoomConnectionService;
}

export function createRoomCore(
  durations: RoomDurations,
  createStartingDeck?: (roomId: RoomId) => GameTrackCard[],
): RoomCore {
  const gameFlowService = new GameFlowService();
  const store = new RoomStore();
  const events = new RoomEvents();
  const timers = new RoomTimerCoordinator(
    store,
    durations.reconnectGracePeriodMs,
    durations.hostTransferGracePeriodMs,
    durations.turnSkipGracePeriodMs,
    durations.allPlayersOfflineRoomTtlMs,
  );
  const emitRoomStateChanged = (roomState: PublicRoomState): void =>
    events.emit("roomStateChanged", roomState);
  const connection = new RoomConnectionService(
    store,
    timers,
    gameFlowService,
    emitRoomStateChanged,
    (roomId) => events.emit("spotifyPlaybackHandoff", roomId),
    () => events.emit("roomDirectoryChanged"),
    (roomId) => events.emit("roomExpired", roomId),
    (socketId) => events.emit("socketLeft", socketId),
  );
  const lobby = new RoomLobbyService(
    store,
    timers,
    gameFlowService,
    connection,
    emitRoomStateChanged,
    durations.maxActiveRoomCount,
    (previousRoomId, nextRoomId) => events.emit("roomRenamed", previousRoomId, nextRoomId),
    (roomId) => events.emit("roomClosed", roomId),
  );
  const gameplay = new RoomGameplayService(
    store,
    timers,
    gameFlowService,
    emitRoomStateChanged,
    createStartingDeck,
  );

  return { store, timers, events, acks: new RoomActionAcks(store), lobby, gameplay, connection };
}
