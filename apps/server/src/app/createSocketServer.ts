import { Server } from "socket.io";
import { createCorsOriginValidator } from "./clientOrigin.js";
import { env } from "./env.js";
import type { createHttpServer } from "./createHttpServer.js";

type HttpServerInstance = ReturnType<typeof createHttpServer>["httpServer"];

export function createSocketServer(httpServer: HttpServerInstance): Server {
  return new Server(httpServer, {
    cors: {
      origin: createCorsOriginValidator(env.CLIENT_ORIGIN, env.NODE_ENV),
    },
    maxHttpBufferSize: 5 * 1024 * 1024,
  });
}
