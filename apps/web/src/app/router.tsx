import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";
import { loadLazyRoute } from "./lazyRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoutes,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await loadLazyRoute(() => import("../pages/HomePage/HomePage"));

          return {
            Component: HomePage,
          };
        },
      },
      {
        // Play was replaced by Join (`22` §3); old links and bookmarks still arrive.
        path: "play",
        element: <Navigate replace to="/join" />,
      },
      {
        path: "join",
        lazy: async () => {
          const { JoinPage } = await loadLazyRoute(() => import("../pages/JoinPage/JoinPage"));

          return {
            Component: JoinPage,
          };
        },
      },
      {
        path: "join/:roomId",
        lazy: async () => {
          const { JoinRoomPage } = await loadLazyRoute(
            () => import("../pages/JoinRoomPage/JoinRoomPage"),
          );

          return {
            Component: JoinRoomPage,
          };
        },
      },
      {
        path: "lobby/:roomId?",
        lazy: async () => {
          const { LobbyPage } = await loadLazyRoute(() => import("../pages/LobbyPage/LobbyPage"));

          return {
            Component: LobbyPage,
          };
        },
      },
      {
        path: "game/:roomId",
        lazy: async () => {
          const { GamePage } = await loadLazyRoute(() => import("../pages/GamePage/GamePage"));

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
                const { DesignSystemPage } =
                  await import("../pages/DesignSystemPage/DesignSystemPage");

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
