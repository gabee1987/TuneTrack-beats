import { Server } from "socket.io";
import { createCorsOriginValidator } from "./clientOrigin.js";
import { env } from "./env.js";
import type { createHttpServer } from "./createHttpServer.js";

export const STATE_UPDATE_COMPRESSION_THRESHOLD_BYTES = 4 * 1024;

type HttpServerInstance = ReturnType<typeof createHttpServer>["httpServer"];

// No `connectionStateRecovery`: the session-id rejoin already restores room, identity and the
// full state after any interruption, and every update is a full state (05 A7).
export function createSocketServer(httpServer: HttpServerInstance): Server {
  return new Server(httpServer, {
    cors: {
      origin: createCorsOriginValidator(env.CLIENT_ORIGIN, env.NODE_ENV),
    },
    maxHttpBufferSize: 5 * 1024 * 1024,
    // A ping every 20 s keeps idle mobile connections alive through carrier and proxy timeouts;
    // 25 s for the pong tolerates phones that throttle background tabs. Dead sockets still
    // surface within 45 s, as with the defaults.
    pingInterval: 20_000,
    pingTimeout: 25_000,
    // Every update is a full room state: about 117 kB at 6 players × 30 cards. Deflate makes it a
    // fraction of that on the wire; small messages stay uncompressed (05 A10, decision 20).
    perMessageDeflate: { threshold: STATE_UPDATE_COMPRESSION_THRESHOLD_BYTES },
  });
}
