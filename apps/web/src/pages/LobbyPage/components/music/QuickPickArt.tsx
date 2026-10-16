import type { SpotifyQuickPickPresetId } from "@tunetrack/shared/client";
import type { ReactNode } from "react";
import { classNames } from "../../../../features/ui/classNames";
import styles from "./QuickPickArt.module.css";

const on = styles.on;
const accent = styles.accent;
const ink = styles.ink;
const line = styles.line;
const faint = styles.faint;

/**
 * Each quick pick's cover: a gradient and one motif for its style, drawn as a few static SVG
 * shapes, so the grid costs no image requests and no animation.
 */
const MOTIFS: Record<SpotifyQuickPickPresetId, ReactNode> = {
  "80s_hits": (
    <>
      <circle className={accent} cx="24" cy="26" r="12" />
      <rect className={styles.base} height="1.6" width="26" x="11" y="27" />
      <rect className={styles.base} height="2.2" width="26" x="11" y="31" />
      <rect className={styles.base} height="2.8" width="26" x="11" y="35" />
      <rect className={ink} height="10" opacity="0.45" width="48" x="0" y="38" />
      <path
        className={classNames(line, faint)}
        d="M0 38h48M24 38 4 48M24 38 16 48M24 38l8 10M24 38l20 10M0 42.5h48"
      />
    </>
  ),
  "90s_rock": (
    <>
      <circle className={classNames(line, faint)} cx="24" cy="24" r="16" />
      <polygon className={accent} points="28,6 13,27 22,27 18,42 35,19 26,19 31,6" />
    </>
  ),
  "2000s_pop": (
    <>
      <circle className={on} cx="22" cy="26" r="15" />
      <circle className={styles.sheen} cx="22" cy="26" r="10" />
      <circle className={styles.base} cx="22" cy="26" r="4" />
      <path className={accent} d="M39 4l1.8 5.2L46 11l-5.2 1.8L39 18l-1.8-5.2L32 11l5.2-1.8Z" />
    </>
  ),
  metal_classics: (
    <>
      <circle className={accent} cx="35" cy="13" r="5" />
      <polygon className={on} points="0,40 7,24 12,32 19,10 26,30 32,19 39,34 48,22 48,48 0,48" />
      <polygon className={ink} opacity="0.55" points="19,10 22,21 17,27 15,19" />
    </>
  ),
  iconic_songs: (
    <>
      <path className={ink} d="M10 34 8 15l9 9 7-13 7 13 9-9-2 19Z" />
      <rect className={ink} height="4" rx="1" width="28" x="10" y="36" />
      <circle className={accent} cx="24" cy="10" r="2.5" />
      <circle className={accent} cx="8" cy="14" r="2" />
      <circle className={accent} cx="40" cy="14" r="2" />
    </>
  ),
  disco_best: (
    <>
      <path className={classNames(line, faint)} d="M24 0v10" />
      <circle className={on} cx="24" cy="25" r="14" />
      <path
        className={styles.grid}
        d="M10 25h28M12 18h24M12 32h24M24 11v28M17 12.5c-3 7-3 18 0 25M31 12.5c3 7 3 18 0 25"
      />
      <path className={accent} d="M40 33l1.4 3.6L45 38l-3.6 1.4L40 43l-1.4-3.6L35 38l3.6-1.4Z" />
      <circle className={accent} cx="8" cy="12" r="1.6" />
    </>
  ),
  party_mix: (
    <>
      <path className={line} d="M6 40c6-10 12 2 18-8s12-2 18-12" />
      <rect
        className={accent}
        height="4"
        rx="1"
        transform="rotate(-30 11 12)"
        width="8"
        x="7"
        y="10"
      />
      <rect className={on} height="4" rx="1" transform="rotate(25 34 9)" width="8" x="30" y="7" />
      <rect
        className={ink}
        height="4"
        rx="1"
        transform="rotate(60 38 32)"
        width="8"
        x="34"
        y="30"
      />
      <circle className={on} cx="20" cy="20" r="2.5" />
      <circle className={accent} cx="40" cy="44" r="2.5" />
      <circle className={ink} cx="12" cy="30" r="2" />
      <circle className={accent} cx="28" cy="10" r="1.8" />
    </>
  ),
  movie_night: (
    <>
      <rect className={on} height="17" rx="2" width="30" x="9" y="22" />
      <g transform="rotate(-10 9 20)">
        <rect className={on} height="6" rx="1" width="30" x="9" y="14" />
        <polygon className={ink} points="14,14 19,14 16,20 11,20" />
        <polygon className={ink} points="24,14 29,14 26,20 21,20" />
        <polygon className={ink} points="34,14 39,14 36,20 31,20" />
      </g>
      <polygon className={accent} points="21,26 30,30.5 21,35" />
    </>
  ),
  decades_challenge: (
    <>
      <path className={line} d="M5 28h38" />
      <rect className={on} height="10" rx="1.5" width="8" x="6" y="12" />
      <rect className={on} height="10" rx="1.5" width="8" x="15" y="34" />
      <rect className={on} height="10" rx="1.5" width="8" x="25" y="12" />
      <rect className={accent} height="10" rx="1.5" width="8" x="34" y="34" />
      <circle className={on} cx="10" cy="28" r="2.5" />
      <circle className={on} cx="19" cy="28" r="2.5" />
      <circle className={on} cx="29" cy="28" r="2.5" />
      <circle className={accent} cx="38" cy="28" r="2.5" />
    </>
  ),
  rock_pop_timeline: (
    <>
      <circle className={ink} cx="24" cy="24" r="17" />
      <circle className={classNames(line, styles.groove)} cx="24" cy="24" r="13.5" />
      <circle className={classNames(line, styles.groove)} cx="24" cy="24" r="10" />
      <circle className={accent} cx="24" cy="24" r="6" />
      <circle className={ink} cx="24" cy="24" r="1.4" />
    </>
  ),
  dance_timeline: (
    <>
      <rect className={on} height="8" rx="1.75" width="3.5" x="6" y="20" />
      <rect className={on} height="16" rx="1.75" width="3.5" x="11.5" y="16" />
      <rect className={on} height="26" rx="1.75" width="3.5" x="17" y="11" />
      <rect className={accent} height="32" rx="1.75" width="3.5" x="22.5" y="8" />
      <rect className={on} height="22" rx="1.75" width="3.5" x="28" y="13" />
      <rect className={on} height="14" rx="1.75" width="3.5" x="33.5" y="17" />
      <rect className={on} height="9" rx="1.75" width="3.5" x="39" y="19.5" />
    </>
  ),
  female_icons: (
    <>
      <rect className={on} height="19" rx="6" width="12" x="18" y="7" />
      <path className={styles.grid} d="M18 13h12M18 18h12" />
      <path className={line} d="M13.5 21a10.5 10.5 0 0 0 21 0M24 31.5V38M18 39.5h12" />
      <path className={accent} d="M40 6l1.4 3.6L45 11l-3.6 1.4L40 16l-1.4-3.6L35 11l3.6-1.4Z" />
    </>
  ),
  alternative_indie: (
    <>
      <rect className={on} height="24" rx="3" width="38" x="5" y="12" />
      <rect className={accent} height="8" rx="1.5" width="30" x="9" y="15" />
      <rect className={ink} height="7" rx="3.5" width="22" x="13" y="25.5" />
      <circle className={on} cx="18" cy="29" r="2.2" />
      <circle className={on} cx="30" cy="29" r="2.2" />
    </>
  ),
  global_party: (
    <>
      <circle className={on} cx="24" cy="24" opacity="0.18" r="15" />
      <circle className={line} cx="24" cy="24" r="15" />
      <ellipse className={line} cx="24" cy="24" rx="6.5" ry="15" />
      <path className={line} d="M9 24h30M11 16.5h26M11 31.5h26" />
      <circle className={accent} cx="41" cy="8" r="2.4" />
      <circle className={accent} cx="7" cy="41" r="1.8" />
    </>
  ),
  japanese_music: (
    <>
      <circle className={accent} cx="24" cy="19" r="10" />
      <polygon className={ink} points="2,42 18,22 30,22 46,42" />
      <polygon className={on} points="18,22 30,22 33.5,26.5 28.5,25 24,28.5 19.5,25 14.5,26.5" />
    </>
  ),
  hungarian_music: (
    <>
      <path className={line} d="M24 27v15" />
      <path
        className={on}
        d="M24 39c-6 0-10-4-11-8 5 0 9 3 11 8ZM24 39c6 0 10-4 11-8-5 0-9 3-11 8Z"
      />
      <path
        className={accent}
        d="M24 27c-8 0-11-7-10-15 4 3 7 7 10 15ZM24 27c8 0 11-7 10-15-4 3-7 7-10 15Z"
      />
      <path className={accent} d="M24 8c-4 4-5 10 0 18 5-8 4-14 0-18Z" />
      <circle className={on} cx="24" cy="20" r="1.6" />
    </>
  ),
};

interface QuickPickArtProps {
  presetId: SpotifyQuickPickPresetId;
}

export function QuickPickArt({ presetId }: QuickPickArtProps) {
  return (
    <span aria-hidden="true" className={styles.art} data-art={presetId}>
      <svg className={styles.svg} viewBox="0 0 48 48">
        {MOTIFS[presetId]}
      </svg>
    </span>
  );
}
