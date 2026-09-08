import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigationType, useOutlet } from "react-router-dom";
import { MotionPresence, PageTransition } from "../features/motion";
import type { ScreenTransitionDirection } from "../features/motion";

function getRouteOrder(pathname: string) {
  if (pathname.startsWith("/game/")) {
    return 2;
  }

  if (pathname.startsWith("/lobby/")) {
    return 1;
  }

  return 0;
}

export function AppRoutes() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const previousPathnameRef = useRef(location.pathname);
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

  return (
    <div
      style={{
        minHeight: "var(--app-height)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MotionPresence mode="sync">
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
