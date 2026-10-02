import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3102);
const unexpectedRequests = [];
const playlistId = "TESTPLAYLIST1234567890";
const playlistTracks = Array.from({ length: 10 }, (_, index) => ({
  track: {
    id: `E2E_TRACK_${index + 1}`,
    name: `E2E Track ${index + 1}`,
    artists: [{ name: "E2E Artist" }],
    album: {
      name: "E2E Album",
      release_date: `${1980 + index}-01-01`,
      images: [],
    },
    preview_url: null,
    uri: `spotify:track:E2E_TRACK_${index + 1}`,
  },
}));

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (requestUrl.pathname === "/health") {
    sendJson(response, { status: "ok" });
    return;
  }

  if (requestUrl.pathname === "/requests") {
    sendJson(response, { unexpectedRequests });
    return;
  }

  if (requestUrl.pathname === "/accounts/authorize") {
    const redirectUri = requestUrl.searchParams.get("redirect_uri");
    const state = requestUrl.searchParams.get("state");
    if (redirectUri && state) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("code", "E2E_AUTH_CODE");
      callbackUrl.searchParams.set("state", state);
      response.writeHead(302, { Location: callbackUrl.toString() });
      response.end();
      return;
    }
  }

  if (request.method === "POST" && requestUrl.pathname === "/accounts/api/token") {
    sendJson(response, {
      access_token: "E2E_ACCESS_TOKEN",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "E2E_REFRESH_TOKEN",
      scope: "streaming user-read-private",
    });
    return;
  }

  if (requestUrl.pathname === "/api/me") {
    sendJson(response, { id: "E2E_SPOTIFY_USER", product: "premium" });
    return;
  }

  if (requestUrl.pathname === `/api/playlists/${playlistId}/tracks`) {
    sendJson(response, { items: playlistTracks, next: null, total: playlistTracks.length });
    return;
  }

  if (requestUrl.pathname === `/api/playlists/${playlistId}`) {
    sendJson(response, { name: "E2E Playlist" });
    return;
  }

  unexpectedRequests.push(`${request.method ?? "UNKNOWN"} ${request.url ?? "/"}`);
  response.writeHead(502, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Unexpected Spotify request during E2E." }));
});

function sendJson(response, body) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
