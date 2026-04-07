import {
  DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_STARTING_TIMELINE_CARD_COUNT,
  ClientToServerEvent,
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_CHALLENGE_WINDOW_DURATION_SECONDS,
  DEFAULT_TARGET_TIMELINE_CARD_COUNT,
  MIN_CHALLENGE_WINDOW_DURATION_SECONDS,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MAX_TARGET_TIMELINE_CARD_COUNT,
  MIN_TARGET_TIMELINE_CARD_COUNT,
  type PlayerIdentityPayload,
  type PublicPlayerState,
  type RoomClosedPayload,
  type PublicRoomSettings,
  ServerToClientEvent,
  type PublicRoomState,
  type RevealConfirmMode,
  type ServerErrorPayload,
  type StateUpdatePayload,
} from "@tunetrack/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getOrCreatePlayerSessionId,
  getRememberedPlayerDisplayName,
  rememberPlayerDisplayName,
} from "../../services/session/playerSession";
import { socketClient } from "../../services/socket/socketClient";
import styles from "./LobbyPage.module.css";

export function LobbyPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const displayName = useMemo(
    () => searchParams.get("playerName")?.trim() ?? getRememberedPlayerDisplayName(),
    [searchParams],
  );
  const playerSessionId = useMemo(() => getOrCreatePlayerSessionId(), []);

  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);
  const [roomState, setRoomState] = useState<PublicRoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHost = roomState?.hostId === currentPlayerId;

  useEffect(() => {
    if (!roomId || !displayName) {
      navigate("/");
      return;
    }

    rememberPlayerDisplayName(displayName);

    function handleConnect() {
      setConnectionStatus("Connected");
      setErrorMessage(null);
      socketClient.emit(ClientToServerEvent.JoinRoom, {
        roomId,
        displayName,
        sessionId: playerSessionId,
      });
    }

    function handleDisconnect() {
      setConnectionStatus("Disconnected");
    }

    function handleStateUpdate(payload: StateUpdatePayload) {
      setRoomState(payload.roomState);

      if (payload.roomState.status !== "lobby") {
        navigate(`/game/${encodeURIComponent(payload.roomState.roomId)}`, {
          state: {
            currentPlayerId: currentPlayerIdRef.current,
            roomState: payload.roomState,
          },
        });
      }
    }

    function handlePlayerIdentity(payload: PlayerIdentityPayload) {
      currentPlayerIdRef.current = payload.playerId;
      setCurrentPlayerId(payload.playerId);
    }

    function handleError(payload: ServerErrorPayload) {
      setErrorMessage(payload.message);
    }

    function handleRoomClosed(_: RoomClosedPayload) {
      navigate("/");
    }

    socketClient.on("connect", handleConnect);
    socketClient.on("disconnect", handleDisconnect);
    socketClient.on(ServerToClientEvent.PlayerIdentity, handlePlayerIdentity);
    socketClient.on(ServerToClientEvent.RoomClosed, handleRoomClosed);
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
      socketClient.off(ServerToClientEvent.RoomClosed, handleRoomClosed);
      socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
      socketClient.off(ServerToClientEvent.Error, handleError);
    };
  }, [displayName, navigate, playerSessionId, roomId]);

  function handleRoomSettingsChange(nextSettings: PublicRoomSettings) {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.UpdateRoomSettings, {
      roomId: roomState.roomId,
      ...nextSettings,
    });
  }

  const currentSettings = roomState?.settings ?? {
    targetTimelineCardCount: DEFAULT_TARGET_TIMELINE_CARD_COUNT,
    defaultStartingTimelineCardCount: DEFAULT_STARTING_TIMELINE_CARD_COUNT,
    revealConfirmMode: "host_only" as RevealConfirmMode,
    ttModeEnabled: false,
    challengeWindowDurationSeconds: DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS,
  };

  function handlePlayerStartingCardCountChange(
    player: PublicPlayerState,
    nextValue: number,
  ) {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.UpdatePlayerSettings, {
      roomId: roomState.roomId,
      playerId: player.id,
      startingTimelineCardCount: nextValue,
    });
  }

  function handleStartGame() {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.StartGame, {
      roomId: roomState.roomId,
    });
  }

  function handleCloseRoom() {
    if (!roomState || !isHost) {
      return;
    }

    socketClient.emit(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
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
                <p className={styles.settingsDescription}>Host-only room setup</p>
              </div>
            </div>

            <label className={styles.settingField}>
              <div className={styles.settingLabelRow}>
                <span>Cards needed to win</span>
                <strong className={styles.settingValue}>
                  {currentSettings.targetTimelineCardCount}
                </strong>
              </div>
              <input
                className={styles.rangeInput}
                max={MAX_TARGET_TIMELINE_CARD_COUNT}
                min={MIN_TARGET_TIMELINE_CARD_COUNT}
                onChange={(event) =>
                  handleRoomSettingsChange({
                    ...currentSettings,
                    targetTimelineCardCount: Number(event.target.value),
                  })
                }
                type="range"
                value={currentSettings.targetTimelineCardCount}
              />
            </label>

            <label className={styles.settingField}>
              <div className={styles.settingLabelRow}>
                <span>Default starting cards for new players</span>
                <strong className={styles.settingValue}>
                  {currentSettings.defaultStartingTimelineCardCount}
                </strong>
              </div>
              <input
                className={styles.rangeInput}
                max={MAX_STARTING_TIMELINE_CARD_COUNT}
                min={MIN_STARTING_TIMELINE_CARD_COUNT}
                onChange={(event) =>
                  handleRoomSettingsChange({
                    ...currentSettings,
                    defaultStartingTimelineCardCount: Number(event.target.value),
                  })
                }
                type="range"
                value={currentSettings.defaultStartingTimelineCardCount}
              />
            </label>

            <label className={styles.settingField}>
              <div className={styles.settingLabelRow}>
                <span>Who can confirm reveal</span>
              </div>
              <select
                className={styles.selectInput}
                onChange={(event) =>
                  handleRoomSettingsChange({
                    ...currentSettings,
                    revealConfirmMode: event.target
                      .value as RevealConfirmMode,
                  })
                }
                value={currentSettings.revealConfirmMode}
              >
                <option value="host_only">Host only</option>
                <option value="host_or_active_player">
                  Host or active player
                </option>
              </select>
            </label>

            <label className={styles.checkboxField}>
              <input
                checked={currentSettings.ttModeEnabled}
                onChange={(event) =>
                  handleRoomSettingsChange({
                    ...currentSettings,
                    ttModeEnabled: event.target.checked,
                  })
                }
                type="checkbox"
              />
              <span>Enable TT mode</span>
            </label>

            <label className={styles.settingField}>
              <div className={styles.settingLabelRow}>
                <span>Challenge window</span>
                <strong className={styles.settingValue}>
                  {currentSettings.challengeWindowDurationSeconds === null
                    ? "Host manual"
                    : `${currentSettings.challengeWindowDurationSeconds}s`}
                </strong>
              </div>
              <select
                className={styles.selectInput}
                onChange={(event) =>
                  handleRoomSettingsChange({
                    ...currentSettings,
                    challengeWindowDurationSeconds:
                      event.target.value === "manual"
                        ? null
                        : Number(event.target.value),
                  })
                }
                value={
                  currentSettings.challengeWindowDurationSeconds === null
                    ? "manual"
                    : currentSettings.challengeWindowDurationSeconds.toString()
                }
              >
                <option value="manual">Host manual</option>
                <option value={DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS.toString()}>
                  {DEFAULT_CHALLENGE_WINDOW_DURATION_SECONDS} seconds
                </option>
                <option value={MIN_CHALLENGE_WINDOW_DURATION_SECONDS.toString()}>
                  {MIN_CHALLENGE_WINDOW_DURATION_SECONDS} seconds
                </option>
                <option value={MAX_CHALLENGE_WINDOW_DURATION_SECONDS.toString()}>
                  {MAX_CHALLENGE_WINDOW_DURATION_SECONDS} seconds
                </option>
              </select>
            </label>

            <p className={styles.settingsHint}>
              You are the host, so you can change this setting.
            </p>

            <button
              className={styles.startGameButton}
              onClick={handleStartGame}
              type="button"
            >
              Start Game
            </button>

            <button
              className={styles.cancelRoomButton}
              onClick={handleCloseRoom}
              type="button"
            >
              Cancel Room
            </button>

          </section>
        ) : null}

        <ul className={styles.playerList}>
          {(roomState?.players ?? []).map((player) => (
            <li className={styles.playerItem} key={player.id}>
              <div className={styles.playerInfoRow}>
                <span>{player.displayName}</span>
                <div className={styles.playerBadges}>
                  <span className={styles.startingCardsBadge}>
                    {player.startingTimelineCardCount} starting cards
                  </span>
                  <span>{player.ttTokenCount} TT</span>
                  {player.isHost ? <span>Host</span> : null}
                </div>
              </div>

              {isHost ? (
                <label className={styles.playerSettingField}>
                  <div className={styles.settingLabelRow}>
                    <span>Starting cards</span>
                    <strong className={styles.settingValue}>
                      {player.startingTimelineCardCount}
                    </strong>
                  </div>
                  <input
                    className={styles.rangeInput}
                    max={MAX_STARTING_TIMELINE_CARD_COUNT}
                    min={MIN_STARTING_TIMELINE_CARD_COUNT}
                    onChange={(event) =>
                      handlePlayerStartingCardCountChange(
                        player,
                        Number(event.target.value),
                      )
                    }
                    type="range"
                    value={player.startingTimelineCardCount}
                  />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
