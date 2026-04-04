import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../pages/HomePage/HomePage";
import { LobbyPage } from "../pages/LobbyPage/LobbyPage";
export const router = createBrowserRouter([
    {
        path: "/",
        element: _jsx(HomePage, {}),
    },
    {
        path: "/lobby/:roomId",
        element: _jsx(LobbyPage, {}),
    },
]);
