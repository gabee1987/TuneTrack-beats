import { createBrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoutes,
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import("../pages/HomePage/HomePage");

          return {
            Component: HomePage,
          };
        },
      },
      {
        path: "lobby/:roomId",
        lazy: async () => {
          const { LobbyPage } = await import("../pages/LobbyPage/LobbyPage");

          return {
            Component: LobbyPage,
          };
        },
      },
      {
        path: "game/:roomId",
        lazy: async () => {
          const { GamePage } = await import("../pages/GamePage/GamePage");

          return {
            Component: GamePage,
          };
        },
      },
    ],
  },
]);
