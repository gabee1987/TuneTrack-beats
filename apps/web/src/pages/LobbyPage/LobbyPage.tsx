import {
  ClientToServerEvent,
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
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
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
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
      socketClient.disconnect();
    };
  }, [displayName, navigate, roomId]);

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Lobby</h1>
            <p className={styles.meta}>Room: {roomState?.roomId ?? roomId}</p>
            <p className={styles.meta}>
              Target cards: {roomState?.targetTimelineCardCount ?? 10}
            </p>
          </div>

          <div className={styles.status}>{connectionStatus}</div>
        </div>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

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
