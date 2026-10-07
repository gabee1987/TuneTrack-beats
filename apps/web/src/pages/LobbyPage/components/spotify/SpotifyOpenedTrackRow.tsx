import { animate, m, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import type { PublicTrackInfo } from "@tunetrack/shared/client";
import { useI18n } from "../../../../features/i18n";
import { SelectableArtwork, SelectableArtworkImage } from "../SelectableArtwork";
import { CheckIcon, PlusIcon, SpotifyLogo, TrashIcon } from "./spotifySetupIcons";
import { SMART_SEARCH_SWIPE_REVEAL_WIDTH, SMART_SEARCH_SWIPE_THRESHOLD } from "./spotifySetupTypes";
import discoveryStyles from "./spotifyDiscovery.module.css";
import panelsStyles from "./spotifyPanels.module.css";

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
  const rowRef = useRef<HTMLDivElement>(null);

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
      const rowWidth =
        rowRef.current?.getBoundingClientRect().width ?? SMART_SEARCH_SWIPE_REVEAL_WIDTH;
      isActing.current = true;
      await Promise.all([
        animate(x, -rowWidth, {
          duration: 0.2,
          ease: [0.4, 0, 1, 1],
        }),
        animate(removeZoneWidth, rowWidth, {
          duration: 0.2,
          ease: [0.4, 0, 1, 1],
        }),
      ]);
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
    <div className={discoveryStyles.spotifySmartResultRowWrapper} ref={rowRef}>
      {!isAdded ? (
        <m.div className={discoveryStyles.spotifySmartAddZone} style={{ width: addZoneWidth }}>
          <m.div style={{ opacity: addIconOpacity, scale: addIconScale }}>
            <PlusIcon />
          </m.div>
        </m.div>
      ) : null}
      {isAdded ? (
        <m.div
          className={discoveryStyles.spotifySmartRemoveZone}
          style={{ width: removeZoneWidth }}
        >
          <m.div style={{ opacity: removeIconOpacity, scale: removeIconScale }}>
            <TrashIcon />
          </m.div>
        </m.div>
      ) : null}
      <m.div
        className={panelsStyles.spotifyOpenedTrackRow}
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

        <button
          className={discoveryStyles.spotifySmartResultOpenButton}
          onClick={onOpen}
          type="button"
        >
          <span className={discoveryStyles.spotifySmartResultMeta}>
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
          className={`${discoveryStyles.spotifySmartQueueButton} ${
            isAdded ? discoveryStyles.spotifySmartQueueButtonAdded : ""
          }`}
          onClick={isAdded ? onRemoveFromQueue : onAdd}
          title={
            isAdded ? t("lobby.spotify.builder.addedTrack") : t("lobby.spotify.builder.addTrack")
          }
          type="button"
        >
          <span className={discoveryStyles.spotifySmartQueueButtonFace}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
          </span>
        </button>
      </m.div>
    </div>
  );
}
