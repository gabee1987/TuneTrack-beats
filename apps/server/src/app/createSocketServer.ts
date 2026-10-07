import { Server } from "socket.io";
import { createCorsOriginValidator } from "./clientOrigin.js";
import { env } from "./env.js";
import type { createHttpServer } from "./createHttpServer.js";

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
  });
}
