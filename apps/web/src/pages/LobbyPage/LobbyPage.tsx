import {
  ClientToServerEvent,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PlayerIdentityPayload,
  ServerToClientEvent,
  type PublicRoomState,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { socketClient } from "../../services/socket/socketClient";
import styles from "./LobbyPage.module.css";

export function LobbyPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const displayName = useMemo(
    () => searchParams.get("playerName")?.trim() ?? "",
    [searchParams],
  );

  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHost = roomState?.hostId === currentPlayerId;

  useEffect(() => {
    if (!roomId || !displayName) {
      navigate("/");
      return;
    }

    function handleConnect() {
      setConnectionStatus("Connected");
      setErrorMessage(null);
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        roomId,
        displayName,
      });
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
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
      socketClient.off("disconnect", handleDisconnect);
      socketClient.off(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
      socketClient.disconnect();
    };
  }, [displayName, navigate, roomId]);

  function handleTargetCardCountChange(nextValue: number) {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: roomState.roomId,
      targetTimelineCardCount: nextValue,
    });
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Lobby</h1>
            <p className={styles.meta}>Room: {roomState?.roomId ?? roomId}</p>
          </div>

          <div className={styles.status}>{connectionStatus}</div>
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {isHost ? (
          <section className={styles.settingsCard}>
            <div className={styles.settingsHeader}>
              <div>
                <h2 className={styles.settingsTitle}>Game settings</h2>
                <p className={styles.settingsDescription}>
                  Number of cards needed to win
                </p>
              </div>
              <strong className={styles.targetValue}>
                {roomState?.targetTimelineCardCount ??
                  DEFAULT_TARGET_TIMELINE_CARD_COUNT}
              </strong>
            </div>

            <input
              className={styles.rangeInput}
              max={MAX_TARGET_TIMELINE_CARD_COUNT}
              min={MIN_TARGET_TIMELINE_CARD_COUNT}
              onChange={(event) =>
                handleTargetCardCountChange(Number(event.target.value))
              }
              type="range"
              value={
                roomState?.targetTimelineCardCount ??
                DEFAULT_TARGET_TIMELINE_CARD_COUNT}
            />

            <p className={styles.settingsHint}>
              You are the host, so you can change this setting.
            </p>
          </section>
        ) : null}

        <ul className={styles.playerList}>
          {(roomState?.players ?? []).map((player) => (
            <li className={styles.playerItem} key={player.id}>
              <span>{player.displayName}</span>
              <span>{player.isHost ? "Host" : `${player.tokenCount} tokens`}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
