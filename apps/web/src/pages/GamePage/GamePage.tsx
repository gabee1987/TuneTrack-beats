import {
  ClientToServerEvent,
  type PlayerIdentityPayload,
  ServerToClientEvent,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
} from "../../services/session/playerSession";
import { socketClient } from "../../services/socket/socketClient";
import styles from "./GamePage.module.css";

interface GameRouteState {
  currentPlayerId: string | null;
  roomState: PublicRoomState | null;
}

export function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as Partial<GameRouteState>;
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);
  const rememberedDisplayName = useMemo(
    () => getRememberedPlayerDisplayName(),
    [],
  );

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    routeState.currentPlayerId ?? null,
  );
  const [roomState, setRoomState] = useState<PublicRoomState | null>(
    routeState.roomState ?? null,
  );
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activePlayer = roomState?.players.find(
    (player) => player.id === roomState.turn?.activePlayerId,
  );
  const activePlayerTimeline = useMemo(() => {
    if (!roomState || !roomState.turn?.activePlayerId) {
      return [];
    }

    return roomState.timelines[roomState.turn.activePlayerId] ?? [];
  }, [roomState]);

  const isCurrentPlayerTurn =
    Boolean(currentPlayerId) &&
    roomState?.turn?.activePlayerId === currentPlayerId;
  const canSelectSlot = roomState?.status === "turn" && isCurrentPlayerTurn;
  const canConfirmReveal =
    roomState?.status === "reveal" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    if (!rememberedDisplayName) {
      navigate("/");
      return;
    }

    function handleConnect() {
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        roomId,
        displayName: rememberedDisplayName,
        sessionId: playerSessionId,
      });
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);
      setSelectedSlotIndex(0);
      setErrorMessage(null);
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    socketClient.on("connect", handleConnect);
    socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
    socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
    socketClient.on(ServerToClientEvent.Error, handleError);

    if (!socketClient.connected) {
      socketClient.connect();
    } else {
      handleConnect();
    }

    return () => {
      socketClient.off("connect", handleConnect);
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [navigate, playerSessionId, rememberedDisplayName, roomId]);

  function handlePlaceCard() {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    socketClient.emit(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleConfirmReveal() {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    socketClient.emit(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }

  if (!roomState) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Loading game...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Game Room</h1>
            <p className={styles.meta}>Room: {roomState.roomId}</p>
            <p className={styles.meta}>
              Phase: {roomState.status} | Turn:{" "}
              {roomState.turn?.turnNumber ?? "-"}
            </p>
          </div>
          <div className={styles.statusBadge}>
            {roomState.winnerPlayerId
              ? "Finished"
              : `${activePlayer?.displayName ?? "Unknown"}'s turn`}
          </div>
        </header>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <section className={styles.currentCardPanel}>
          <p className={styles.sectionLabel}>Current card</p>
          {roomState.currentTrackCard ? (
            <>
              <h2 className={styles.cardTitle}>
                {roomState.currentTrackCard.title}
              </h2>
              <p className={styles.cardMeta}>
                {roomState.currentTrackCard.artist} ·{" "}
                {roomState.currentTrackCard.albumTitle}
              </p>
              {roomState.currentTrackCard.genre ? (
                <p className={styles.genre}>
                  {roomState.currentTrackCard.genre}
                </p>
              ) : null}
            </>
          ) : (
            <p className={styles.cardMeta}>No current card.</p>
          )}
        </section>

        <section className={styles.timelinePanel}>
          <p className={styles.sectionLabel}>
            {activePlayer?.displayName ?? "Active player"}'s timeline
          </p>
          <p className={styles.timelineHint}>
            {canSelectSlot
              ? "Tap any slot to preview your placement, then confirm when you are sure."
              : "Watching the active player's timeline. Placement controls are locked for this turn."}
          </p>
          <div className={styles.timelineRow}>
            {Array.from({ length: activePlayerTimeline.length + 1 }).map(
              (_, slotIndex) => (
                <div
                  className={styles.slotGroup}
                  key={`slot-${slotIndex.toString()}`}
                >
                  <button
                    className={`${styles.slotButton} ${
                      canSelectSlot && selectedSlotIndex === slotIndex
                        ? styles.slotButtonSelected
                        : ""
                    }`}
                    disabled={!canSelectSlot}
                    onClick={() => setSelectedSlotIndex(slotIndex)}
                    type="button"
                  >
                    Slot {slotIndex}
                  </button>

                  {slotIndex < activePlayerTimeline.length ? (
                    <article className={styles.timelineCard}>
                      <h3 className={styles.timelineTitle}>
                        {activePlayerTimeline[slotIndex]?.title}
                      </h3>
                      <p className={styles.cardMeta}>
                        {activePlayerTimeline[slotIndex]?.artist}
                      </p>
                      <strong className={styles.yearText}>
                        {activePlayerTimeline[slotIndex]?.revealedYear}
                      </strong>
                    </article>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>

        {roomState.status === "turn" ? (
          <button
            className={styles.primaryButton}
            disabled={!isCurrentPlayerTurn || !roomState.currentTrackCard}
            onClick={handlePlaceCard}
            type="button"
          >
            {isCurrentPlayerTurn
              ? `Confirm Placement: Slot ${selectedSlotIndex}`
              : "Waiting for active player"}
          </button>
        ) : null}

        {roomState.status === "reveal" && roomState.revealState ? (
          <section className={styles.revealPanel}>
            <p className={styles.sectionLabel}>Reveal</p>
            <h2 className={styles.cardTitle}>
              {roomState.revealState.placedCard.title}
            </h2>
            <p className={styles.cardMeta}>
              {roomState.revealState.placedCard.artist} ·{" "}
              {roomState.revealState.placedCard.revealedYear}
            </p>
            <p className={styles.revealResult}>
              {roomState.revealState.wasCorrect
                ? "Correct placement"
                : `Wrong placement. Valid slot(s): ${roomState.revealState.validSlotIndexes.join(
                    ", ",
                  )}`}
            </p>

            <button
              className={styles.primaryButton}
              disabled={!canConfirmReveal}
              onClick={handleConfirmReveal}
              type="button"
            >
              {canConfirmReveal
                ? "Confirm Reveal"
                : "Waiting for reveal confirmation"}
            </button>
          </section>
        ) : null}

        {roomState.status === "finished" ? (
          <section className={styles.revealPanel}>
            <p className={styles.sectionLabel}>Game Over</p>
            <h2 className={styles.cardTitle}>
              {
                roomState.players.find(
                  (player) => player.id === roomState.winnerPlayerId,
                )?.displayName
              }{" "}
              wins!
            </h2>
          </section>
        ) : null}
      </section>
    </main>
  );
}
