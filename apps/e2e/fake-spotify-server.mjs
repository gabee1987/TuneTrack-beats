import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3102);
const unexpectedRequests = [];

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (request.url === "/requests") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ unexpectedRequests }));
    return;
  }

  unexpectedRequests.push(`${request.method ?? "UNKNOWN"} ${request.url ?? "/"}`);
  response.writeHead(502, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Unexpected Spotify request during E2E." }));
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
