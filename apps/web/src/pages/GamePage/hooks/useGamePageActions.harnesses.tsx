import { act } from "@testing-library/react";
import type { PublicRoomState } from "@tunetrack/shared/client";
import { I18nProvider, useI18n } from "../../../features/i18n";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import {
  buildChallengeRoomState,
  buildRevealRoomState,
  buildRoomSettings,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
} from "../../../test/roomStateFixtures";
import { ChallengeActionPanel } from "../components/ChallengeActionPanel";
import { RevealActionDock } from "../components/RevealActionDock";
import { TurnActionDock } from "../components/TurnActionDock";
import { GameMenuPlayerItem } from "../gameMenu/GameMenuPlayerItem";
import { TokenAdjustButtons } from "../gameMenu/TokenAdjustButtons";
import { useGamePageActions } from "./useGamePageActions";

/**
 * Real game-page controls wired to `useGamePageActions`, for the action-family tests. Each test
 * file mocks `services/socket/emitAction` itself.
 */

type ActionOptions = Parameters<typeof useGamePageActions>[0];

const noop = () => {};

export function createDeferredActionResult() {
  let resolve!: (result: EmitActionResult) => void;
  const promise = new Promise<EmitActionResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

export async function finishWithTimeout(deferred: ReturnType<typeof createDeferredActionResult>) {
  await act(async () => {
    deferred.resolve({ status: "timeout" });
    await deferred.promise;
  });
}

function buildActionOptions(
  roomState: PublicRoomState,
  overrides: Partial<ActionOptions> = {},
): ActionOptions {
  return {
    canClaimChallenge: false,
    canConfirmReveal: false,
    canResolveChallengeWindow: false,
    canSelectChallengeSlot: false,
    currentPlayerId: TEST_HOST_ID,
    isCurrentPlayerTurn: true,
    roomState,
    selectedSlotIndex: 1,
    setLocallyPlacedCard: noop,
    ...overrides,
  };
}

export function buildTtTurnRoomState() {
  return buildTurnRoomState({ settings: buildRoomSettings({ ttModeEnabled: true }) });
}

/** The host's turn has passed to a disconnected guest, so the host may skip it. */
export function buildOfflineGuestTurnRoomState() {
  const players = buildTurnRoomState().players;
  return buildTurnRoomState({
    players: [
      { ...players[0]!, connectionStatus: "connected" },
      { ...players[1]!, connectionStatus: "disconnected" },
    ],
    turn: {
      activePlayerId: TEST_GUEST_ID,
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: Date.now() + 10_000,
    },
  });
}

interface TurnDockHarnessProps {
  canConfirmTurnPlacement?: boolean;
  canSkipOfflinePlayer?: boolean;
  canUseBuyCard?: boolean;
  canUseSkipTrack?: boolean;
  options?: Partial<ActionOptions>;
  onTokenSpendAnimationStart?: () => void;
  roomState: PublicRoomState;
}

export function TurnDockHarness({
  canConfirmTurnPlacement = false,
  canSkipOfflinePlayer = false,
  canUseBuyCard = false,
  canUseSkipTrack = false,
  options,
  onTokenSpendAnimationStart,
  roomState,
}: TurnDockHarnessProps) {
  const actions = useGamePageActions(buildActionOptions(roomState, options));
  const activePlayerName =
    roomState.players.find((player) => player.id === roomState.turn?.activePlayerId)?.displayName ??
    null;

  return (
    <I18nProvider>
      <TurnActionDock
        buyTimelineCardActionStatus={actions.buyTimelineCardActionStatus}
        canConfirmTurnPlacement={canConfirmTurnPlacement}
        canSkipOfflinePlayer={canSkipOfflinePlayer}
        canUseBuyCard={canUseBuyCard}
        canUseSkipTrack={canUseSkipTrack}
        handleBuyTimelineCardWithTt={actions.handleBuyTimelineCardWithTt}
        handlePlaceCard={actions.handlePlaceCard}
        handleSkipOfflinePlayer={actions.handleSkipTurn}
        handleSkipTrackWithTt={actions.handleSkipTrackWithTt}
        isBuyTimelineCardPending={actions.isBuyTimelineCardPending}
        isPlaceCardPending={actions.isPlaceCardPending}
        isSkipTrackPending={actions.isSkipTrackPending}
        isSkipTurnPending={actions.isSkipTurnPending}
        {...(onTokenSpendAnimationStart ? { onTokenSpendAnimationStart } : {})}
        placeCardActionStatus={actions.placeCardActionStatus}
        skipTrackActionStatus={actions.skipTrackActionStatus}
        skipCandidateName={canSkipOfflinePlayer ? activePlayerName : null}
        skipTurnActionStatus={actions.skipTurnActionStatus}
        status={roomState.status}
        turnSkipDeadlineEpochMs={roomState.turn?.turnSkipDeadlineEpochMs ?? null}
      />
    </I18nProvider>
  );
}

export function RevealHarness() {
  const roomState = buildRevealRoomState();
  const actions = useGamePageActions(buildActionOptions(roomState, { canConfirmReveal: true }));

  return (
    <I18nProvider>
      <RevealActionDock
        canConfirmReveal
        confirmRevealActionStatus={actions.confirmRevealActionStatus}
        handleConfirmReveal={actions.handleConfirmReveal}
        isConfirmRevealPending={actions.isConfirmRevealPending}
        status={roomState.status}
      />
    </I18nProvider>
  );
}

type ChallengeStep = "claim" | "place" | "resolve";

function buildChallengeHarnessState(step: ChallengeStep) {
  if (step !== "place") return buildChallengeRoomState();
  return buildChallengeRoomState({
    challengeState: {
      phase: "claimed",
      originalPlayerId: TEST_HOST_ID,
      originalSelectedSlotIndex: 0,
      challengerPlayerId: TEST_GUEST_ID,
      challengeDeadlineEpochMs: null,
      challengerSelectedSlotIndex: null,
    },
  });
}

/** The guest claims or places a Beat; the host, whose turn it is, resolves the window. */
export function ChallengeHarness({ step }: { step: ChallengeStep }) {
  const roomState = buildChallengeHarnessState(step);
  const isHost = step === "resolve";
  const actions = useGamePageActions(
    buildActionOptions(roomState, {
      canClaimChallenge: step === "claim",
      canResolveChallengeWindow: step === "resolve",
      canSelectChallengeSlot: step === "place",
      currentPlayerId: isHost ? TEST_HOST_ID : TEST_GUEST_ID,
      isCurrentPlayerTurn: isHost,
    }),
  );

  return (
    <I18nProvider>
      <ChallengeActionPanel
        canClaimChallenge={step === "claim"}
        canConfirmBeatPlacement={step === "place"}
        canResolveChallengeWindow={step === "resolve"}
        challengeActionBody="Challenge body"
        challengeActionTitle="Challenge title"
        claimChallengeActionStatus={actions.claimChallengeActionStatus}
        currentPlayerTtCount={1}
        handleClaimChallenge={actions.handleClaimChallenge}
        handlePlaceChallenge={actions.handlePlaceChallenge}
        handleResolveChallengeWindow={actions.handleResolveChallengeWindow}
        isClaimChallengePending={actions.isClaimChallengePending}
        isCurrentPlayerTurn={isHost}
        isPlaceChallengePending={actions.isPlaceChallengePending}
        isResolveChallengeWindowPending={actions.isResolveChallengeWindowPending}
        placeChallengeActionStatus={actions.placeChallengeActionStatus}
        resolveChallengeWindowActionStatus={actions.resolveChallengeWindowActionStatus}
        challengeDeadlineEpochMs={roomState.challengeState?.challengeDeadlineEpochMs ?? null}
        challengePhase={roomState.challengeState?.phase ?? null}
        ttModeEnabled={roomState.settings.ttModeEnabled}
      />
    </I18nProvider>
  );
}

export function CloseRoomHarness() {
  const actions = useGamePageActions(buildActionOptions(buildTurnRoomState()));

  return (
    <button disabled={actions.isCloseRoomPending} onClick={actions.handleCloseRoom}>
      {actions.closeRoomActionStatus}
    </button>
  );
}

function GameMenuPlayerHarnessContent() {
  const roomState = buildTurnRoomState();
  const { t } = useI18n();
  const actions = useGamePageActions(buildActionOptions(roomState));

  return (
    <ul>
      <GameMenuPlayerItem
        awardTtActionState={actions.awardTtActionState}
        cardCount={1}
        isActiveTurnPlayer={false}
        isCurrentPlayer={false}
        isViewerHost
        isAwardTtPending={actions.isAwardTtPending}
        isKickPlayerPending={actions.isKickPlayerPending}
        isTransferHostPending={actions.isTransferHostPending}
        kickPlayerActionState={actions.kickPlayerActionState}
        onAwardTt={actions.handleAwardTt}
        onKickPlayer={actions.handleKickPlayer}
        onRemoveTt={actions.handleRemoveTt}
        onTransferHost={actions.handleTransferHost}
        player={roomState.players[1]!}
        t={t}
        transferHostActionState={actions.transferHostActionState}
        ttModeEnabled={roomState.settings.ttModeEnabled}
      />
    </ul>
  );
}

/** The host's game-menu row for the guest: transfer host and kick. */
export function GameMenuPlayerHarness() {
  return (
    <I18nProvider>
      <GameMenuPlayerHarnessContent />
    </I18nProvider>
  );
}

export function AwardTtHarness() {
  const actions = useGamePageActions(buildActionOptions(buildTtTurnRoomState()));

  return (
    <I18nProvider>
      <TokenAdjustButtons
        actionState={actions.awardTtActionState}
        currentTokenCount={1}
        isActionPending={actions.isAwardTtPending}
        onAwardTt={() => actions.handleAwardTt(TEST_GUEST_ID)}
        onRemoveTt={() => actions.handleRemoveTt(TEST_GUEST_ID)}
        playerId={TEST_GUEST_ID}
      />
    </I18nProvider>
  );
}
