import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigation, useNavigationType, useOutlet } from "react-router-dom";
import { MotionPresence, PageTransition } from "../features/motion";
import { motionDurations } from "../features/motion/coreMotionTokens";
import type { ScreenTransitionDirection } from "../features/motion";

const ROUTE_ORDER: ReadonlyArray<{ prefix: string; order: number }> = [
  { prefix: "/game/", order: 3 },
  { prefix: "/lobby/", order: 2 },
  { prefix: "/join/", order: 1 },
  { prefix: "/play", order: 1 },
];

export function getRouteOrder(pathname: string): number {
  return ROUTE_ORDER.find(({ prefix }) => pathname.startsWith(prefix))?.order ?? 0;
}

/**
 * Under `mode="sync"` a second navigation landing mid-exit can leave the previous page
 * mounted; since it is `position: absolute; inset: 0`, an orphan covers the whole screen
 * and swallows every tap. `pointerEvents: "none"` on the exit variant (coreMotionTokens)
 * neutralises the symptom; this budget just makes a stuck exit visible in development
 * instead of silent.
 */
const EXIT_WARNING_BUDGET_MS = motionDurations.screen * 1000 * 2;

/**
 * A route whose module never loads leaves the navigation pending, so the screen never
 * changes and the control that triggered it looks dead. `AppRouteError` covers the
 * failure case; this names the stall while it is still happening.
 */
const PENDING_NAVIGATION_BUDGET_MS = 8_000;

export function AppRoutes() {
  const location = useLocation();
  const navigation = useNavigation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const previousPathnameRef = useRef(location.pathname);
  const exitWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const direction = useMemo<ScreenTransitionDirection>(() => {
    const previousRouteOrder = getRouteOrder(previousPathnameRef.current);
    const currentRouteOrder = getRouteOrder(location.pathname);

    if (location.pathname === previousPathnameRef.current) {
      return 1;
    }

    if (currentRouteOrder === previousRouteOrder) {
      return navigationType === "POP" ? -1 : 1;
    }

    return currentRouteOrder > previousRouteOrder ? 1 : -1;
  }, [location.pathname, navigationType]);

  useEffect(() => {
    previousPathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn(
        `[AppRoutes] the page transition for "${location.pathname}" has not reported ` +
          `onExitComplete after ${EXIT_WARNING_BUDGET_MS}ms — a stuck exiting page may be ` +
          "covering the screen and swallowing input.",
      );
    }, EXIT_WARNING_BUDGET_MS);
    exitWarningTimeoutRef.current = timeoutId;

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.key, location.pathname]);

  useEffect(() => {
    if (!import.meta.env.DEV || navigation.state === "idle") {
      return;
    }

    const pendingPath = navigation.location?.pathname ?? "(unknown)";
    const timeoutId = setTimeout(() => {
      console.warn(
        `[AppRoutes] the navigation to "${pendingPath}" has been pending for ` +
          `${PENDING_NAVIGATION_BUDGET_MS}ms. Its route module is probably not resolving, ` +
          "which blocks every later navigation until the app is reloaded.",
      );
    }, PENDING_NAVIGATION_BUDGET_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [navigation.location?.pathname, navigation.state]);

  function handleExitComplete() {
    if (exitWarningTimeoutRef.current) {
      clearTimeout(exitWarningTimeoutRef.current);
      exitWarningTimeoutRef.current = null;
    }
  }

  return (
    <div
      style={{
        minHeight: "var(--app-height)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MotionPresence mode="sync" onExitComplete={handleExitComplete}>
        <PageTransition
          direction={direction}
          key={location.key}
        >
          {outlet}
        </PageTransition>
      </MotionPresence>
    </div>
  );
}
