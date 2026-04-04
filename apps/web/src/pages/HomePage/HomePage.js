import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
export function HomePage() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("party-room");
    const [displayName, setDisplayName] = useState("Player 1");
    function handleSubmit(event) {
        event.preventDefault();
        const trimmedRoomId = roomId.trim();
        const trimmedDisplayName = displayName.trim();
        if (!trimmedRoomId || !trimmedDisplayName) {
            return;
        }
        navigate(`/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(trimmedDisplayName)}`);
    }
    return (_jsx("main", { className: styles.screen, children: _jsxs("section", { className: styles.panel, children: [_jsx("h1", { className: styles.title, children: "TuneTrack" }), _jsx("p", { className: styles.subtitle, children: "Join a room, listen together, and build your music timeline." }), _jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [_jsxs("label", { className: styles.field, children: ["Room code", _jsx("input", { className: styles.input, onChange: (event) => setRoomId(event.target.value), type: "text", value: roomId })] }), _jsxs("label", { className: styles.field, children: ["Player name", _jsx("input", { className: styles.input, onChange: (event) => setDisplayName(event.target.value), type: "text", value: displayName })] }), _jsx("button", { className: styles.button, type: "submit", children: "Join Room" })] })] }) }));
}
