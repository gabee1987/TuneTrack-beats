import { lazy, Suspense } from "react";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { MotionLayoutFeatures } from "../../features/motion/MotionLayoutFeatures";
import { RoomResetModal } from "../../features/ui/RoomResetModal";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
import { buildLobbyAssemblyModel } from "./hooks/buildLobbyAssemblyModel";
import { useLobbyPageController } from "./hooks/useLobbyPageController";

const LobbyPageMobile = lazy(async () => {
  const module = await import("./mobile/LobbyPageMobile");
  return { default: module.LobbyPageMobile };
});

const LobbyPageDesktop = lazy(async () => {
  const module = await import("./desktop/LobbyPageDesktop");
  return { default: module.LobbyPageDesktop };
});

export function LobbyPage() {
  const controller = useLobbyPageController();
  const layoutMode = usePageLayoutMode();
  const model = buildLobbyAssemblyModel(controller);

  return (
    <MotionLayoutFeatures>
      <RoomResetModal
        isOpen={controller.hasClosedRoomReset}
        onReset={controller.handleClosedRoomReset}
        reason={controller.closedRoomReason}
      />
      <Suspense fallback={<AppRouteFallback />}>
        {layoutMode === "mobile" ? (
          <LobbyPageMobile model={model} />
        ) : (
          <LobbyPageDesktop model={model} />
        )}
      </Suspense>
    </MotionLayoutFeatures>
  );
}
