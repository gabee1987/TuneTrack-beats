import { createBrowserRouter } from "react-router-dom";
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
          const { HomePage } = await loadLazyRoute(() =>
            import("../pages/HomePage/HomePage"),
          );

          return {
            Component: HomePage,
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
    ],
  },
]);
