import { createBrowserRouter } from "react-router-dom";
import { GamePage } from "../pages/GamePage/GamePage";
import { HomePage } from "../pages/HomePage/HomePage";
import { LobbyPage } from "../pages/LobbyPage/LobbyPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/lobby/:roomId",
    element: <LobbyPage />,
  },
  {
    path: "/game/:roomId",
    element: <GamePage />,
  },
]);
