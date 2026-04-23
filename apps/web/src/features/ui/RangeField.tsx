import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./SettingField.module.css";
import { SettingField } from "./SettingField";

interface RangeFieldProps {
  density?: "compact" | "default" | undefined;
  info?: string;
  label: string;
  max: number;
  min: number;
  onChange: (nextValue: number) => void;
  value: number;
}

export function RangeField({
  density = "default",
  label,
  info,
  max,
  min,
  onChange,
  value,
}: RangeFieldProps) {
  const isCompact = density === "compact";
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScrollSelectionRef = useRef(false);
  const [rangeWidth, setRangeWidth] = useState(0);
  const values = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [max, min],
  );
  const minimumTickWidth = isCompact ? 11 : 14;
  const maximumTickWidth = isCompact ? 64 : 72;
  const tickWidth =
    rangeWidth > 0
      ? Math.max(
          minimumTickWidth,
          Math.min(maximumTickWidth, Math.floor(rangeWidth / values.length)),
        )
      : minimumTickWidth;
  const rangeStyle = {
    ["--snap-range-value-count" as string]: values.length,
    ["--snap-range-tick-width" as string]: `${tickWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    const range = rangeRef.current;

    if (!range) {
      return;
    }

    setRangeWidth(range.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setRangeWidth(nextWidth);
    });

    resizeObserver.observe(range);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    if (isScrollSelectionRef.current) {
      isScrollSelectionRef.current = false;
      return;
    }

    const selectedTick = scroller.querySelector<HTMLElement>(
      `[data-range-value="${value}"]`,
    );

    if (!selectedTick) {
      return;
    }

    const nextScrollLeft =
      selectedTick.offsetLeft -
      scroller.clientWidth / 2 +
      selectedTick.offsetWidth / 2;
    const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const clampedScrollLeft = Math.max(0, Math.min(maxScrollLeft, nextScrollLeft));

    scroller.scrollTo({
      // Avoid fighting momentum/inertial scrolling when the user flicks.
      // Snap layout already provides smooth physical movement.
      behavior: "auto",
      left: clampedScrollLeft,
    });
  }, [tickWidth, value]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  function commitNearestValue() {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const scrollerCenter =
      scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
    const ticks = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-range-value]"),
    );
    const nearestTick = ticks.reduce<HTMLElement | null>((nearest, tick) => {
      if (!nearest) {
        return tick;
      }

      const tickCenter = tick.getBoundingClientRect().left + tick.offsetWidth / 2;
      const nearestCenter =
        nearest.getBoundingClientRect().left + nearest.offsetWidth / 2;

      return Math.abs(tickCenter - scrollerCenter) <
        Math.abs(nearestCenter - scrollerCenter)
        ? tick
        : nearest;
    }, null);
    const nextValue = Number(nearestTick?.dataset.rangeValue);

    if (Number.isFinite(nextValue) && nextValue !== value) {
      isScrollSelectionRef.current = true;
      onChange(nextValue);
    }
  }

  function handleScroll() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      commitNearestValue();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    onChange(Math.max(min, Math.min(max, value + direction)));
  }

  return (
    <SettingField
      className={isCompact ? styles.compactField : undefined}
      info={info}
      label={label}
      value={value}
    >
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        className={`${styles.snapRange}${isCompact ? ` ${styles.compactSnapRange}` : ""}`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        ref={rangeRef}
        role="slider"
        style={rangeStyle}
        tabIndex={0}
      >
        <div aria-hidden="true" className={styles.snapRangeCenterLine} />
        <div
          className={styles.snapRangeScroller}
          onScroll={handleScroll}
          ref={scrollerRef}
        >
          {values.map((rangeValue) => {
            const distance = Math.abs(rangeValue - value);
            const isSelected = rangeValue === value;
            const isMajorTick = rangeValue === min || rangeValue === max || distance === 0;

            return (
              <button
                aria-label={`${label}: ${rangeValue}`}
                className={`${styles.snapRangeTick}${
                  isSelected ? ` ${styles.snapRangeTickSelected}` : ""
                }${isMajorTick ? ` ${styles.snapRangeTickMajor}` : ""}`}
                data-range-value={rangeValue}
                key={rangeValue}
                onClick={() => onChange(rangeValue)}
                type="button"
              >
                <span className={styles.snapRangeTickLine} />
              </button>
            );
          })}
        </div>
      </div>
    </SettingField>
  );
}
