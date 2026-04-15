import { lazy, Suspense } from "react";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
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

  return (
    <Suspense fallback={<AppRouteFallback />}>
      {layoutMode === "mobile" ? (
        <LobbyPageMobile controller={controller} />
      ) : (
        <LobbyPageDesktop controller={controller} />
      )}
    </Suspense>
  );
}
