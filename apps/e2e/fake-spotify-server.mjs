import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3102);
const unexpectedRequests = [];
// The second playlist has two re-releases, whose years the host is asked to check.
const playlists = new Map([
  ["TESTPLAYLIST1234567890", { name: "E2E Playlist", tracks: buildTracks("E2E", 0) }],
  [
    "TESTFLAGGED1234567890",
    { name: "E2E Flagged Playlist", tracks: buildTracks("E2E Flagged", 2) },
  ],
]);

function buildTracks(prefix, remasteredCount) {
  return Array.from({ length: 10 }, (_, index) => {
    const id = `${prefix.replace(/\W+/g, "_").toUpperCase()}_TRACK_${index + 1}`;
    return {
      track: {
        id,
        name: `${prefix} Track ${index + 1}`,
        artists: [{ name: "E2E Artist" }],
        album: {
          name: index < remasteredCount ? "E2E Album (Remastered)" : "E2E Album",
          release_date: `${1980 + index}-01-01`,
          images: [],
        },
        preview_url: null,
        uri: `spotify:track:${id}`,
      },
    };
  });
}

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

  // Songs come from the first playlist; every playlist search, a quick pick's too, finds it.
  if (requestUrl.pathname === "/api/search") {
    const type = requestUrl.searchParams.get("type");
    const isFirstPage = (requestUrl.searchParams.get("offset") ?? "0") === "0";
    const searchPlaylistId = "TESTPLAYLIST1234567890";
    const searchPlaylist = playlists.get(searchPlaylistId);
    if (type === "track") {
      const items = isFirstPage ? searchPlaylist.tracks.slice(0, 3).map((item) => item.track) : [];
      sendJson(response, { tracks: { items, next: null, total: items.length } });
      return;
    }
    if (type === "playlist") {
      const items = isFirstPage
        ? [
            {
              id: searchPlaylistId,
              name: searchPlaylist.name,
              owner: { display_name: "E2E Owner" },
              images: [],
              tracks: { total: searchPlaylist.tracks.length },
            },
          ]
        : [];
      sendJson(response, { playlists: { items } });
      return;
    }
    sendJson(response, { [`${type}s`]: { items: [] } });
    return;
  }

  const playlistMatch = /^\/api\/playlists\/([^/]+)(\/tracks)?$/.exec(requestUrl.pathname);
  const playlist = playlistMatch ? playlists.get(playlistMatch[1]) : undefined;
  if (playlist && playlistMatch?.[2]) {
    sendJson(response, { items: playlist.tracks, next: null, total: playlist.tracks.length });
    return;
  }
  if (playlist) {
    sendJson(response, { name: playlist.name });
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
