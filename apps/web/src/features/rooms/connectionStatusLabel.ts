import type { ConnectionStatus } from "../../services/socket/connectionState";

/** Connecting and connected stay silent: a first connect is fast and needs no indicator. */
export function getConnectionProblemLabelKey(status: ConnectionStatus): string | null {
  switch (status) {
    case "reconnecting":
      return "room.connection.reconnecting";
    case "offline":
      return "room.connection.offline";
    case "server_restarting":
      return "room.connection.serverRestarting";
    case "connecting":
    case "connected":
      return null;
  }
}
