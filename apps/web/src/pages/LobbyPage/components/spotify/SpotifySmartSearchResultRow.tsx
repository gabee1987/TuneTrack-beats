import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import type { SpotifySmartSearchResult } from "@tunetrack/shared";
import { useI18n } from "../../../../features/i18n";
import { SelectableArtwork, SelectableArtworkImage } from "../SelectableArtwork";
import { CheckIcon, PlusIcon, SpotifyLogo, TrashIcon } from "./spotifySetupIcons";
import { SMART_SEARCH_SWIPE_REVEAL_WIDTH, SMART_SEARCH_SWIPE_THRESHOLD } from "./spotifySetupTypes";
import styles from "./spotifyStyles";

interface SpotifySmartSearchResultRowProps {
  isAdded: boolean;
  isSelected: boolean;
  onAdd: () => void;
  onOpenPlaylist: () => void;
  onRemove: () => void;
  onToggleSelection: () => void;
  result: SpotifySmartSearchResult;
}

export function SpotifySmartSearchResultRow({
  isAdded,
  isSelected,
  onAdd,
  onOpenPlaylist,
  onRemove,
  onToggleSelection,
  result,
}: SpotifySmartSearchResultRowProps) {
  const { t } = useI18n();
  const x = useMotionValue(0);
  const addZoneWidth = useMotionValue(0);
  const removeZoneWidth = useMotionValue(0);
  const addIconOpacity = useTransform(
    addZoneWidth,
    [0, 40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0, 0, 1],
  );
  const addIconScale = useTransform(addZoneWidth, [40, SMART_SEARCH_SWIPE_REVEAL_WIDTH], [0.6, 1]);
  const removeIconOpacity = useTransform(
    removeZoneWidth,
    [0, 40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0, 0, 1],
  );
  const removeIconScale = useTransform(
    removeZoneWidth,
    [40, SMART_SEARCH_SWIPE_REVEAL_WIDTH],
    [0.6, 1],
  );
  const isActing = useRef(false);
  const isTrack = result.type === "track";

  useEffect(() => {
    return x.on("change", (value) => {
      if (isActing.current) return;
      addZoneWidth.set(Math.max(0, value));
      removeZoneWidth.set(Math.max(0, -value));
    });
  }, [addZoneWidth, removeZoneWidth, x]);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isTrack || isActing.current) return;

    if (!isAdded && info.offset.x > SMART_SEARCH_SWIPE_THRESHOLD) {
      isActing.current = true;
      await animate(x, SMART_SEARCH_SWIPE_REVEAL_WIDTH, {
        duration: 0.14,
        ease: [0.2, 0, 0, 1],
      });
      onAdd();
      await animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
      addZoneWidth.set(0);
      removeZoneWidth.set(0);
      isActing.current = false;
      return;
    }

    if (isAdded && info.offset.x < -SMART_SEARCH_SWIPE_THRESHOLD) {
      isActing.current = true;
      await animate(x, -SMART_SEARCH_SWIPE_REVEAL_WIDTH, {
        duration: 0.14,
        ease: [0.2, 0, 0, 1],
      });
      onRemove();
      await animate(x, 0, { type: "spring", stiffness: 520, damping: 38 });
      addZoneWidth.set(0);
      removeZoneWidth.set(0);
      isActing.current = false;
      return;
    }

    void animate(x, 0, { type: "spring", stiffness: 500, damping: 38 });
  }

  return (
    <div className={styles.spotifySmartResultRowWrapper}>
      {isTrack ? (
        <motion.div className={styles.spotifySmartAddZone} style={{ width: addZoneWidth }}>
          <motion.div style={{ opacity: addIconOpacity, scale: addIconScale }}>
            <PlusIcon />
          </motion.div>
        </motion.div>
      ) : null}
      {isTrack ? (
        <motion.div className={styles.spotifySmartRemoveZone} style={{ width: removeZoneWidth }}>
          <motion.div style={{ opacity: removeIconOpacity, scale: removeIconScale }}>
            <TrashIcon />
          </motion.div>
        </motion.div>
      ) : null}
      <motion.div
        className={styles.spotifySmartResultRow}
        drag={isTrack ? "x" : false}
        dragConstraints={{
          left: isAdded ? -SMART_SEARCH_SWIPE_REVEAL_WIDTH : 0,
          right: isAdded ? 0 : SMART_SEARCH_SWIPE_REVEAL_WIDTH,
        }}
        dragElastic={{ left: isAdded ? 0.18 : 0, right: isAdded ? 0 : 0.18 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {isTrack ? (
          <SelectableArtwork
            ariaLabel={t("lobby.spotify.builder.toggleTrackSelection", {
              title: result.title,
            })}
            isSelected={isSelected}
            onToggle={onToggleSelection}
          >
            {result.imageUrl ? <SelectableArtworkImage src={result.imageUrl} /> : <SpotifyLogo />}
          </SelectableArtwork>
        ) : result.imageUrl ? (
          <img
            alt=""
            className={styles.spotifySmartResultImage}
            loading="lazy"
            src={result.imageUrl}
          />
        ) : (
          <span className={styles.spotifyPlaylistImageFallback}>
            <SpotifyLogo />
          </span>
        )}

        {isTrack ? (
          <span className={styles.spotifySmartResultMeta}>
            <strong>{result.title}</strong>
            <span>{result.subtitle}</span>
          </span>
        ) : (
          <button
            className={styles.spotifySmartResultOpenButton}
            onClick={onOpenPlaylist}
            type="button"
          >
            <span className={styles.spotifySmartResultMeta}>
              <strong>{result.title}</strong>
              <span>{result.subtitle}</span>
            </span>
          </button>
        )}

        <span className={styles.spotifySmartResultType}>
          {getSmartSearchResultTypeLabel(t, result.type)}
        </span>

        {isTrack ? (
          <button
            aria-label={
              isAdded ? t("lobby.spotify.builder.addedTrack") : t("lobby.spotify.builder.addTrack")
            }
            className={`${styles.spotifySmartQueueButton} ${
              isAdded ? styles.spotifySmartQueueButtonAdded : ""
            }`}
            onClick={isAdded ? onRemove : onAdd}
            title={
              isAdded ? t("lobby.spotify.builder.addedTrack") : t("lobby.spotify.builder.addTrack")
            }
            type="button"
          >
            <span className={styles.spotifySmartQueueButtonFace}>
              {isAdded ? <CheckIcon /> : <PlusIcon />}
            </span>
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}

export function getSmartSearchResultTypeLabel(
  t: ReturnType<typeof useI18n>["t"],
  type: SpotifySmartSearchResult["type"],
) {
  if (type === "track") return t("lobby.spotify.builder.trackType");
  if (type === "album") return t("lobby.spotify.builder.albumType");
  if (type === "artist") return t("lobby.spotify.builder.artistType");
  return t("lobby.spotify.builder.playlistType");
}
