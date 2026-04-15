import { lazy, Suspense } from "react";
import { AppRouteFallback } from "../../app/components/AppRouteFallback";
import { usePageLayoutMode } from "../../hooks/usePageLayoutMode";
import { useHomePageController } from "./hooks/useHomePageController";

const HomePageMobile = lazy(async () => {
  const module = await import("./mobile/HomePageMobile");
  return { default: module.HomePageMobile };
});

const HomePageDesktop = lazy(async () => {
  const module = await import("./desktop/HomePageDesktop");
  return { default: module.HomePageDesktop };
});

export function HomePage() {
  const controller = useHomePageController();
  const layoutMode = usePageLayoutMode();

  return (
    <Suspense fallback={<AppRouteFallback />}>
      {layoutMode === "mobile" ? (
        <HomePageMobile controller={controller} />
      ) : (
        <HomePageDesktop controller={controller} />
      )}
    </Suspense>
  );
}
