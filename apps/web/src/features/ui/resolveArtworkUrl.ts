import { PRACTICE_COVER_PATH_PREFIX } from "@tunetrack/shared/client";
import { hashText } from "./hashText";

interface ArtworkSource {
  artist: string;
  artworkUrl?: string | undefined;
  title: string;
}

const generatedCoverByKey = new Map<string, string>();

/**
 * Practice-deck cards carry a marker path instead of real album art; the cover is drawn here
 * from the card itself, so no image file is stored or fetched. Other artwork passes through.
 */
export function resolveArtworkUrl(card: ArtworkSource): string | undefined {
  if (!card.artworkUrl?.startsWith(PRACTICE_COVER_PATH_PREFIX)) {
    return card.artworkUrl;
  }

  const key = `${card.artist}|${card.title}`;
  let cover = generatedCoverByKey.get(key);
  if (!cover) {
    cover = `data:image/svg+xml,${encodeURIComponent(drawPracticeCover(card.artist, key))}`;
    generatedCoverByKey.set(key, cover);
  }
  return cover;
}

// Never draws the release year: covers are visible before the reveal.
function drawPracticeCover(artist: string, key: string): string {
  const hash = hashText(key);
  const hue = hash % 360;
  const accentHue = (hue + 40 + ((hash >>> 9) % 80)) % 360;
  const discX = 58 + ((hash >>> 3) % 22);
  const discY = 30 + ((hash >>> 7) % 40);
  const angle = (hash >>> 11) % 360;
  const disc = `cx="${discX}" cy="${discY}"`;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">',
    `<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">`,
    `<stop offset="0" stop-color="hsl(${hue},70%,34%)"/>`,
    `<stop offset="1" stop-color="hsl(${accentHue},75%,16%)"/></linearGradient></defs>`,
    '<rect width="96" height="96" fill="url(#g)"/>',
    `<circle ${disc} r="30" fill="hsl(${accentHue},40%,8%)" opacity=".85"/>`,
    `<circle ${disc} r="22" fill="none" stroke="hsl(${hue},60%,70%)" stroke-opacity=".25"/>`,
    `<circle ${disc} r="7" fill="hsl(${hue},85%,62%)"/>`,
    '<text x="10" y="84" fill="#fff" font-family="system-ui,sans-serif" font-size="26" font-weight="800">',
    `${getInitials(artist)}</text></svg>`,
  ].join("");
}

function getInitials(artist: string): string {
  const leadArtist = artist.split(/\s+(?:feat\.|and)\s+/i)[0] ?? artist;
  return leadArtist
    .replace(/^The\s+/i, "")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
