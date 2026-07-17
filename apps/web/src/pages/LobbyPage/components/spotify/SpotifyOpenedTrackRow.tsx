import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import type { PublicTrackInfo } from "@tunetrack/shared";
import { useI18n } from "../../../../features/i18n";
import { SelectableArtwork, SelectableArtworkImage } from "../SelectableArtwork";
import { CheckIcon, PlusIcon, SpotifyLogo, TrashIcon } from "./spotifySetupIcons";
import { SMART_SEARCH_SWIPE_REVEAL_WIDTH, SMART_SEARCH_SWIPE_THRESHOLD } from "./spotifySetupTypes";
import styles from "./LobbySpotifySection.module.css";

interface SpotifyOpenedTrackRowProps {
  isAdded: boolean;
  isSelected: boolean;
  onAdd: () => void;
  onOpen: () => void;
  onRemoveFromQueue: () => void;
  onToggleSelection: () => void;
  track: PublicTrackInfo;
}

export function SpotifyOpenedTrackRow({
  isAdded,
  isSelected,
  onAdd,
  onOpen,
  onRemoveFromQueue,
  onToggleSelection,
  track,
}: SpotifyOpenedTrackRowProps) {
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

  useEffect(() => {
    return x.on("change", (value) => {
      if (isActing.current) return;
      addZoneWidth.set(Math.max(0, value));
      removeZoneWidth.set(Math.max(0, -value));
    });
  }, [addZoneWidth, removeZoneWidth, x]);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (isActing.current) return;

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
      onRemoveFromQueue();
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
      {!isAdded ? (
        <motion.div className={styles.spotifySmartAddZone} style={{ width: addZoneWidth }}>
          <motion.div style={{ opacity: addIconOpacity, scale: addIconScale }}>
            <PlusIcon />
          </motion.div>
        </motion.div>
      ) : null}
      {isAdded ? (
        <motion.div className={styles.spotifySmartRemoveZone} style={{ width: removeZoneWidth }}>
          <motion.div style={{ opacity: removeIconOpacity, scale: removeIconScale }}>
            <TrashIcon />
          </motion.div>
        </motion.div>
      ) : null}
      <motion.div
        className={styles.spotifyOpenedTrackRow}
        drag="x"
        dragConstraints={{
          left: isAdded ? -SMART_SEARCH_SWIPE_REVEAL_WIDTH : 0,
          right: isAdded ? 0 : SMART_SEARCH_SWIPE_REVEAL_WIDTH,
        }}
        dragElastic={{ left: isAdded ? 0.18 : 0, right: isAdded ? 0 : 0.18 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        <SelectableArtwork
          ariaLabel={t("lobby.spotify.builder.toggleTrackSelection", {
            title: track.title,
          })}
          isSelected={isSelected}
          onToggle={onToggleSelection}
        >
          {track.artworkUrl ? <SelectableArtworkImage src={track.artworkUrl} /> : <SpotifyLogo />}
        </SelectableArtwork>

        <button className={styles.spotifySmartResultOpenButton} onClick={onOpen} type="button">
          <span className={styles.spotifySmartResultMeta}>
            <strong>{track.title}</strong>
            <span>
              {track.artist} · {track.releaseYear}
            </span>
          </span>
        </button>

        <button
          aria-label={
            isAdded ? t("lobby.spotify.builder.addedTrack") : t("lobby.spotify.builder.addTrack")
          }
          className={`${styles.spotifySmartQueueButton} ${
            isAdded ? styles.spotifySmartQueueButtonAdded : ""
          }`}
          onClick={isAdded ? onRemoveFromQueue : onAdd}
          title={
            isAdded ? t("lobby.spotify.builder.addedTrack") : t("lobby.spotify.builder.addTrack")
          }
          type="button"
        >
          <span className={styles.spotifySmartQueueButtonFace}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
