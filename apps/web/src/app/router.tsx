import { createBrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { AppRouteError } from "./components/AppRouteError";
import { loadLazyRoute } from "./lazyRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoutes,
    // Every child route inherits this. Without it a failed `lazy()` import resolves to
    // nothing at all: the URL never changes, the screen never updates, and the control
    // the player tapped simply appears dead until the app is refreshed.
    ErrorBoundary: AppRouteError,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await loadLazyRoute(() =>
            import("../pages/HomePage/HomePage"),
          );

          return {
            Component: HomePage,
          };
        },
      },
      {
        path: "play",
        lazy: async () => {
          const { PlayPage } = await loadLazyRoute(() =>
            import("../pages/PlayPage/PlayPage"),
          );

          return {
            Component: PlayPage,
          };
        },
      },
      {
        path: "join/:roomId",
        lazy: async () => {
          const { JoinRoomPage } = await loadLazyRoute(() =>
            import("../pages/JoinRoomPage/JoinRoomPage"),
          );

          return {
            Component: JoinRoomPage,
          };
        },
      },
      {
        path: "lobby/:roomId",
        lazy: async () => {
          const { LobbyPage } = await loadLazyRoute(() =>
            import("../pages/LobbyPage/LobbyPage"),
          );

          return {
            Component: LobbyPage,
          };
        },
      },
      {
        path: "game/:roomId",
        lazy: async () => {
          const { GamePage } = await loadLazyRoute(() =>
            import("../pages/GamePage/GamePage"),
          );

          return {
            Component: GamePage,
          };
        },
      },
      ...(import.meta.env.DEV
        ? [
            {
              path: "dev/ui",
              lazy: async () => {
                const { DesignSystemPage } = await import(
                  "../pages/DesignSystemPage/DesignSystemPage"
                );

                return {
                  Component: DesignSystemPage,
                };
              },
            },
          ]
        : []),
    ],
  },
]);
