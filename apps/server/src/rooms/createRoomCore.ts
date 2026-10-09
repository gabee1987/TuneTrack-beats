import { GameFlowService, type GameTrackCard } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId } from "@tunetrack/shared";
import { RoomActionAcks } from "./RoomActionAcks.js";
import { RoomConnectionService } from "./RoomConnectionService.js";
import { RoomDeckService } from "./RoomDeckService.js";
import { RoomDisconnectPolicy } from "./RoomDisconnectPolicy.js";
import { RoomEvents } from "./RoomEvents.js";
import { RoomGameplayService } from "./RoomGameplayService.js";
import { RoomHostTransfer } from "./RoomHostTransfer.js";
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
  deck: RoomDeckService;
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
  const emitSpotifyPlaybackHandoff = (roomId: RoomId): void =>
    events.emit("spotifyPlaybackHandoff", roomId);
  const hostTransfer = new RoomHostTransfer(store, timers, emitSpotifyPlaybackHandoff);
  const disconnectPolicy = new RoomDisconnectPolicy(
    store,
    timers,
    gameFlowService,
    hostTransfer,
    emitRoomStateChanged,
    (roomId) => events.emit("roomExpired", roomId),
  );
  const connection = new RoomConnectionService(
    store,
    timers,
    gameFlowService,
    hostTransfer,
    disconnectPolicy,
    emitRoomStateChanged,
    emitSpotifyPlaybackHandoff,
    () => events.emit("roomDirectoryChanged"),
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

  return {
    store,
    timers,
    events,
    acks: new RoomActionAcks(store),
    lobby,
    deck: new RoomDeckService(store),
    gameplay,
    connection,
  };
}
