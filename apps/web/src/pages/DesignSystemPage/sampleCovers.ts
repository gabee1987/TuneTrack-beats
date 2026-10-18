import { PRACTICE_COVER_PATH_PREFIX } from "@tunetrack/shared/client";
import { resolveArtworkUrl } from "../../features/ui/resolveArtworkUrl";

/** Four practice covers for the galleries' cover and mosaic states. */
export const SAMPLE_COVERS = [
  "Test Artist A",
  "Test Artist B",
  "Test Artist C",
  "Test Artist D",
].map(
  (artist) =>
    resolveArtworkUrl({
      artist,
      artworkUrl: `${PRACTICE_COVER_PATH_PREFIX}sample`,
      title: "Test Song",
    }) ?? "",
);
