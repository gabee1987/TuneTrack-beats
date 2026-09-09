import { lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { useI18n } from "../../features/i18n";
import { RoomResetModal } from "../../features/ui/RoomResetModal";
import { Button, Dialog } from "../../features/ui/primitives";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
import { GamePageToastStack } from "./components/GamePageToastStack";
import type { GameRouteState, LoadedGamePageController } from "./GamePage.types";
import { buildGamePageAssemblyModel } from "./hooks/buildGamePageAssemblyModel";
import {
  HostPlaybackProvider,
  shouldEnableHostPlayback,
} from "./hooks/HostPlaybackProvider";
import { useGamePageController } from "./hooks/useGamePageController";
import { useGamePageToasts } from "./hooks/useGamePageToasts";
import { useLeaveGameGuard } from "./hooks/useLeaveGameGuard";
import styles from "./gamePageStyles";

const GamePageMobile = lazy(async () => {
  const module = await import("./mobile/GamePageMobile");
  return { default: module.GamePageMobile };
});

const GamePageDesktop = lazy(async () => {
  const module = await import("./desktop/GamePageDesktop");
  return { default: module.GamePageDesktop };
});

export function GamePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as Partial<GameRouteState>;
  const controller = useGamePageController({
    navigate,
    roomId,
    routeState,
  });
  const toasts = useGamePageToasts({
    currentPlayerId: controller.currentPlayerId,
    errorKey: controller.errorKey,
    errorMessage: controller.errorMessage,
    roomState: controller.roomState,
  });
  const layoutMode = usePageLayoutMode();
  const leaveGameGuard = useLeaveGameGuard({
    isGuarded: Boolean(controller.roomState) && controller.roomState?.status !== "finished",
  });
  const screenOverlays = (
    <>
      <RoomResetModal
        isOpen={controller.hasClosedRoomReset}
        onReset={controller.handleClosedRoomReset}
      />
      <Dialog
        actions={
          <>
            <Button onClick={leaveGameGuard.dismissLeave} type="button" variant="secondary">
              {t("common.cancel")}
            </Button>
            <Button onClick={leaveGameGuard.confirmLeave} type="button" variant="danger">
              {t("game.leaveConfirm.confirm")}
            </Button>
          </>
        }
        closeLabel={t("common.close")}
        isOpen={leaveGameGuard.isConfirmVisible}
        onClose={leaveGameGuard.dismissLeave}
        title={t("game.leaveConfirm.title")}
      >
        {t("game.leaveConfirm.message")}
      </Dialog>
    </>
  );

  if (!controller.roomState) {
    return (
      <>
        {screenOverlays}
        <main className={styles.screen}>
          <section className={styles.panel}>
            <h1 className={styles.title}>{t("game.loading")}</h1>
          </section>
        </main>
      </>
    );
  }

  const loadedController: LoadedGamePageController = {
    ...controller,
    roomState: controller.roomState,
  };
  const model = buildGamePageAssemblyModel(loadedController);
  const hostPlaybackEnabled = shouldEnableHostPlayback(
    controller.roomState,
    controller.currentPlayerId,
  );

  return (
    <HostPlaybackProvider
      enabled={hostPlaybackEnabled}
      roomId={controller.roomState.roomId}
      roomState={controller.roomState}
    >
      {screenOverlays}
      <GamePageToastStack toasts={toasts} />
      <Suspense fallback={<AppRouteFallback />}>
        {layoutMode === "mobile" ? (
          <GamePageMobile model={model} />
        ) : (
          <GamePageDesktop model={model} />
        )}
      </Suspense>
    </HostPlaybackProvider>
  );
}
