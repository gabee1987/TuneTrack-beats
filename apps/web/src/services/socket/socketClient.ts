import { io } from "socket.io-client";
import { resolveServerUrl } from "./resolveServerUrl";

const serverUrl = resolveServerUrl({
  envServerUrl: import.meta.env.VITE_SERVER_URL,
  locationHostname: typeof window !== "undefined" ? window.location.hostname : undefined,
  locationProtocol: typeof window !== "undefined" ? window.location.protocol : undefined,
});

export const socketClient = io(serverUrl, {
  autoConnect: false,
});
