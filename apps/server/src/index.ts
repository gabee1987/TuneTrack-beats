import { createHttpServer } from "./app/createHttpServer.js";
import { createSocketServer } from "./app/createSocketServer.js";
import { env } from "./app/env.js";
import { logger } from "./app/logger.js";
import { registerSocketHandlers } from "./realtime/registerSocketHandlers.js";
import { RoomService } from "./rooms/RoomService.js";

const { httpServer } = createHttpServer();
const io = createSocketServer(httpServer);
const roomService = new RoomService();

registerSocketHandlers(io, roomService);

httpServer.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      clientOrigin: env.CLIENT_ORIGIN,
    },
    "TuneTrack server is running",
  );
});
