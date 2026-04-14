import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const { HomePage } = await import("../pages/HomePage/HomePage");

      return {
        Component: HomePage,
      };
    },
  },
  {
    path: "/lobby/:roomId",
    lazy: async () => {
      const { LobbyPage } = await import("../pages/LobbyPage/LobbyPage");

      return {
        Component: LobbyPage,
      };
    },
  },
  {
    path: "/game/:roomId",
    lazy: async () => {
      const { GamePage } = await import("../pages/GamePage/GamePage");

      return {
        Component: GamePage,
      };
    },
  },
]);
