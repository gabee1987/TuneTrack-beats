import { lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { useI18n } from "../../features/i18n";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
import { GamePageToastStack } from "./components/GamePageToastStack";
import type { GameRouteState, LoadedGamePageController } from "./GamePage.types";
import { buildGamePageAssemblyModel } from "./hooks/buildGamePageAssemblyModel";
import { useGamePageController } from "./hooks/useGamePageController";
import { useGamePageToasts } from "./hooks/useGamePageToasts";
import styles from "./GamePage.module.css";

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

  if (!controller.roomState) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <h1 className={styles.title}>{t("game.loading")}</h1>
        </section>
      </main>
    );
  }

  const loadedController: LoadedGamePageController = {
    ...controller,
    roomState: controller.roomState,
  };
  const model = buildGamePageAssemblyModel(loadedController);

  return (
    <>
      <GamePageToastStack toasts={toasts} />
      <Suspense fallback={<AppRouteFallback />}>
        {layoutMode === "mobile" ? (
          <GamePageMobile model={model} />
        ) : (
          <GamePageDesktop model={model} />
        )}
      </Suspense>
    </>
  );
}
