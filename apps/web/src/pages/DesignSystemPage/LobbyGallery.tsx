import type { PublicPlayerState } from "@tunetrack/shared/client";
import { useId, useState } from "react";
import { Button } from "../../features/ui/primitives";
import type {
  LobbyDeckMeter,
  LobbySetupModel,
  LobbyStartNote,
  LobbyStartReason,
} from "../LobbyPage/hooks/lobbySetupModel";
import { selectPlayersStrip } from "../LobbyPage/hooks/lobbySetupModel";
import { LobbyDeckMeter as DeckMeter } from "../LobbyPage/components/LobbyDeckMeter";
import { LobbyInviteCard } from "../LobbyPage/components/LobbyInviteCard";
import { LobbyMusicCard, LobbyMusicSummary } from "../LobbyPage/components/LobbyMusicCard";
import { LobbyPlayersStrip } from "../LobbyPage/components/LobbyPlayersStrip";
import { LobbyRulesCard } from "../LobbyPage/components/LobbyRulesCard";
import { LobbyExitDialog } from "../LobbyPage/components/LobbyExitDialog";
import { LobbyStartDock, LobbyStartSummary } from "../LobbyPage/components/LobbyStartDock";
import { RoomRenameDialog } from "../LobbyPage/components/RoomRenameDialog";
import styles from "./DesignSystemPage.module.css";

const PLAYERS: PublicPlayerState[] = ["Player One", "Player Two", "Player Three", "Player Four"]
  .concat(["Player Five", "Player Six"])
  .map((displayName, index) => ({
    connectionStatus: "connected",
    disconnectedAtEpochMs: null,
    displayName,
    id: `player-${index + 1}`,
    isHost: index === 0,
    reconnectExpiresAtEpochMs: null,
    startingTimelineCardCount: 1,
    ttTokenCount: 0,
  }));

const ENOUGH: LobbyDeckMeter = {
  current: 60,
  isEnough: true,
  playerCount: 4,
  required: 37,
  target: 10,
};
const SHORT: LobbyDeckMeter = {
  current: 12,
  isEnough: false,
  playerCount: 2,
  required: 19,
  target: 10,
};
const noop = () => undefined;

/** The lobby's setup cards and Start dock in their states (`22` §4.4–4.10). */
export function LobbyGallery() {
  const [exitDialog, setExitDialog] = useState<"closed" | "host" | "guest">("closed");
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  return (
    <>
      <section className={styles.section}>
        <h2 className="typeTitleMd">Invite card & players strip</h2>
        <LobbyInviteCard
          isWaitingForPlayers
          onRename={() => setIsRenameOpen(true)}
          players={strip(PLAYERS.slice(0, 1))}
          roomCode="TEST_ROOM_1"
        />
        <LobbyInviteCard
          isWaitingForPlayers={false}
          onRename={noop}
          players={strip(PLAYERS, noop)}
          roomCode="TEST_ROOM_1"
        />
        <LobbyInviteCard
          isWaitingForPlayers={false}
          onRename={noop}
          players={strip([])}
          roomCode={null}
        />
        <RoomRenameDialog
          actionState={null}
          currentCode="TEST_ROOM_1"
          isOpen={isRenameOpen}
          isPending={false}
          onClose={() => setIsRenameOpen(false)}
          onRename={async () => true}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Deck meter & exit dialog</h2>
        <DeckMeter meter={ENOUGH} />
        <DeckMeter meter={SHORT} />
        <div className={styles.row}>
          <Button onClick={() => setExitDialog("host")} variant="secondary">
            Host: close room
          </Button>
          <Button onClick={() => setExitDialog("guest")} variant="secondary">
            Guest: leave room
          </Button>
        </div>
        <LobbyExitDialog
          closeRoomActionStatus="idle"
          isHost={exitDialog !== "guest"}
          isOpen={exitDialog !== "closed"}
          onClose={() => setExitDialog("closed")}
          onCloseRoom={() => setExitDialog("closed")}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Music card</h2>
        <MusicCard music={{ kind: "none" }} status="idle" />
        <MusicCard music={{ kind: "none" }} status="failed" />
        <MusicCard deckMeter={SHORT} music={{ kind: "practice", songCount: 12 }} />
        <MusicCard
          deckMeter={ENOUGH}
          music={{ kind: "spotifyUnconnected", songCount: 60 }}
          tracksToCheckCount={4}
        />
        <MusicCard deckMeter={ENOUGH} music={{ kind: "spotifyPremium", songCount: 60 }} />
        <LobbyMusicSummary hostName="Player One" music={{ kind: "none" }} />
        <LobbyMusicSummary hostName="Player One" music={{ kind: "spotifyFree", songCount: 60 }} />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Rules card</h2>
        <LobbyRulesCard
          onEdit={noop}
          rules={{ isCustom: false, starting: 1, target: 10, tokens: null }}
        />
        <LobbyRulesCard
          onEdit={noop}
          rules={{ isCustom: true, starting: 2, target: 12, tokens: { seconds: 15 } }}
        />
        <LobbyRulesCard
          rules={{ isCustom: true, starting: 1, target: 8, tokens: { seconds: null } }}
        />
      </section>

      <StartDockGallery />
    </>
  );
}

function strip(players: PublicPlayerState[], onShowAll: () => void = noop) {
  return (
    <LobbyPlayersStrip
      currentPlayerId="player-1"
      onEditName={noop}
      onShowAll={onShowAll}
      strip={selectPlayersStrip(players)}
    />
  );
}

function MusicCard({
  deckMeter = null,
  music,
  status = "idle",
  tracksToCheckCount = 0,
}: {
  deckMeter?: LobbyDeckMeter | null;
  music: LobbySetupModel["music"];
  status?: "idle" | "pending" | "failed";
  tracksToCheckCount?: number;
}) {
  return (
    <LobbyMusicCard
      deckMeter={deckMeter}
      music={music}
      onOpen={noop}
      onUsePracticeDeck={noop}
      practiceDeckStatus={status}
      tracksToCheckCount={tracksToCheckCount}
    />
  );
}

const DOCK_STATES: {
  label: string;
  note: LobbyStartNote | null;
  reason: LobbyStartReason | null;
}[] = [
  { label: "No deck", note: null, reason: { kind: "noDeck" } },
  { label: "Creating", note: null, reason: { kind: "creating" } },
  { label: "Silent Spotify deck", note: { kind: "noAudio" }, reason: null },
  { label: "Short deck", note: { kind: "shortDeck", meter: SHORT }, reason: null },
  { label: "Solo", note: { kind: "solo" }, reason: null },
];

function StartDockGallery() {
  const [isReady, setIsReady] = useState(false);

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">Start dock</h2>
      <div className={styles.row}>
        <Button onClick={() => setIsReady((ready) => !ready)} variant="secondary">
          {isReady ? "Block Start" : "Make Start ready"}
        </Button>
      </div>
      <Dock
        note={null}
        reason={isReady ? null : { kind: "noDeck" }}
        songCount={isReady ? 60 : null}
      />
      {DOCK_STATES.map((state) => (
        <div className={styles.stack} key={state.label}>
          <p className="typeCaption">{state.label}</p>
          <Dock note={state.note} reason={state.reason} songCount={state.reason ? null : 60} />
        </div>
      ))}
    </section>
  );
}

function Dock({
  note,
  reason,
  songCount,
}: {
  note: LobbyStartNote | null;
  reason: LobbyStartReason | null;
  songCount: number | null;
}) {
  const lineId = useId();
  const start = { isBlocked: reason !== null, note, playerCount: 2, reason, songCount };

  return (
    <>
      <LobbyStartSummary lineId={lineId} start={start} />
      <LobbyStartDock
        isHintEligible={false}
        onIntentToStart={noop}
        onStart={noop}
        start={start}
        startGameActionStatus="idle"
        summaryLineId={lineId}
      />
    </>
  );
}
