import { lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
import type { GameRouteState, LoadedGamePageController } from "./GamePage.types";
import { useGamePageController } from "./hooks/useGamePageController";
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
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const routeState = (location.state ?? {}) as Partial<GameRouteState>;
  const controller = useGamePageController({
    navigate,
    roomId,
    routeState,
  });
  const layoutMode = usePageLayoutMode();

  if (!controller.roomState) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <h1 className={styles.title}>Loading game...</h1>
        </section>
      </main>
    );
  }

  const loadedController: LoadedGamePageController = {
    ...controller,
    roomState: controller.roomState,
  };

  return (
    <Suspense fallback={<AppRouteFallback />}>
      {layoutMode === "mobile" ? (
        <GamePageMobile controller={loadedController} />
      ) : (
        <GamePageDesktop controller={loadedController} />
      )}
    </Suspense>
  );
}
