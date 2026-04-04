import { Server } from "socket.io";
import { env } from "./env.js";
import type { createHttpServer } from "./createHttpServer.js";

type HttpServerInstance = ReturnType<typeof createHttpServer>["httpServer"];

export function createSocketServer(httpServer: HttpServerInstance): Server {
  return new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
    },
  });
}
