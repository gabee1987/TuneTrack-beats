import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ClientToServerEvent, ServerToClientEvent, } from "@tunetrack/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { socketClient } from "../../services/socket/socketClient";
import styles from "./LobbyPage.module.css";
export function LobbyPage() {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const displayName = useMemo(() => searchParams.get("playerName")?.trim() ?? "", [searchParams]);
    const [connectionStatus, setConnectionStatus] = useState("Connecting");
    const [roomState, setRoomState] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    useEffect(() => {
        if (!roomId || !displayName) {
            navigate("/");
            return;
        }
        function handleConnect() {
            setConnectionStatus("Connected");
            setErrorMessage(null);
            socketClient.emit(ClientToServerEvent.JoinRoom, {
                roomId,
                displayName,
            });
        }
        function handleDisconnect() {
            setConnectionStatus("Disconnected");
        }
        function handleStateUpdate(payload) {
            setRoomState(payload.roomState);
        }
        function handleError(payload) {
            setErrorMessage(payload.message);
        }
        socketClient.on("connect", handleConnect);
        socketClient.on("disconnect", handleDisconnect);
        socketClient.on(ServerToClientEvent.StateUpdate, handleStateUpdate);
        socketClient.on(ServerToClientEvent.Error, handleError);
        if (!socketClient.connected) {
            socketClient.connect();
        }
        else {
            handleConnect();
        }
        return () => {
            socketClient.off("connect", handleConnect);
            socketClient.off("disconnect", handleDisconnect);
            socketClient.off(ServerToClientEvent.StateUpdate, handleStateUpdate);
            socketClient.off(ServerToClientEvent.Error, handleError);
            socketClient.disconnect();
        };
    }, [displayName, navigate, roomId]);
    return (_jsx("main", { className: styles.screen, children: _jsxs("section", { className: styles.panel, children: [_jsxs("div", { className: styles.topRow, children: [_jsxs("div", { children: [_jsx("h1", { className: styles.title, children: "Lobby" }), _jsxs("p", { className: styles.meta, children: ["Room: ", roomState?.roomId ?? roomId] }), _jsxs("p", { className: styles.meta, children: ["Target cards: ", roomState?.targetTimelineCardCount ?? 10] })] }), _jsx("div", { className: styles.status, children: connectionStatus })] }), errorMessage ? _jsx("p", { className: styles.error, children: errorMessage }) : null, _jsx("ul", { className: styles.playerList, children: (roomState?.players ?? []).map((player) => (_jsxs("li", { className: styles.playerItem, children: [_jsx("span", { children: player.displayName }), _jsx("span", { children: player.isHost ? "Host" : `${player.tokenCount} tokens` })] }, player.id))) })] }) }));
}
