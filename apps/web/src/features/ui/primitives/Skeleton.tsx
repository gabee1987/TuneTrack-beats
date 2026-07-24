import type { CSSProperties } from "react";
import { classNames } from "../classNames";
import styles from "./Skeleton.module.css";

export type SkeletonVariant = "circle" | "rect" | "text";

export interface SkeletonProps {
  className?: string | undefined;
  height?: number | string | undefined;
  variant?: SkeletonVariant | undefined;
  width?: number | string | undefined;
}

export function Skeleton({
  className,
  height,
  variant = "rect",
  width,
}: SkeletonProps) {
  const style: CSSProperties = {
    width: width ?? (variant === "text" ? "100%" : undefined),
    height: height ?? (variant === "circle" ? width : undefined),
  };

  return (
    <span
      aria-hidden="true"
      className={classNames(
        styles.skeleton,
        variant === "circle" ? styles.circle : undefined,
        variant === "text" ? styles.text : undefined,
        className,
      )}
      style={style}
    />
  );
}
