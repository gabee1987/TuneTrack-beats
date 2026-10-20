import { useI18n } from "../../i18n";
import { classNames } from "../classNames";
import listRowStyles from "./ListRow.module.css";
import { Skeleton } from "./Skeleton";
import styles from "./ListRowSkeleton.module.css";

/** Mirrors what the loaded row will lead with, at the same size. */
export type ListRowSkeletonLeading = "avatar" | "cover-md" | "cover-sm" | "none";
export type ListRowSkeletonTrailing = "action" | "badge" | "none";

export interface ListRowSkeletonProps {
  hasSubtitle?: boolean | undefined;
  /** Varies the line lengths so a list of placeholders reads like real titles. */
  index?: number | undefined;
  leading?: ListRowSkeletonLeading | undefined;
  trailing?: ListRowSkeletonTrailing | undefined;
}

const TITLE_WIDTHS = ["62%", "48%", "74%", "55%"] as const;
const SUBTITLE_WIDTHS = ["38%", "44%", "30%", "41%"] as const;
const LEADING_SIZES = { avatar: 40, "cover-md": 56, "cover-sm": 40 } as const;

/**
 * A placeholder with the exact layout of a loaded `ListRow`, built on the row's own styles,
 * so the list does not jump when the content arrives.
 */
export function ListRowSkeleton({
  hasSubtitle = true,
  index = 0,
  leading = "cover-sm",
  trailing = "none",
}: ListRowSkeletonProps) {
  const widthIndex = index % TITLE_WIDTHS.length;

  return (
    <div aria-hidden="true" className={listRowStyles.row}>
      <div className={listRowStyles.leading}>
        {leading === "none" ? null : (
          <Skeleton
            className={leading === "avatar" ? undefined : styles.cover}
            height={LEADING_SIZES[leading]}
            variant={leading === "avatar" ? "circle" : "rect"}
            width={LEADING_SIZES[leading]}
          />
        )}
      </div>
      <div className={listRowStyles.copy}>
        <span className={styles.titleLine}>
          <Skeleton variant="text" width={TITLE_WIDTHS[widthIndex]} />
        </span>
        {hasSubtitle ? (
          <span className={styles.subtitleLine}>
            <Skeleton variant="text" width={SUBTITLE_WIDTHS[widthIndex]} />
          </span>
        ) : null}
      </div>
      <div className={listRowStyles.trailing}>
        {trailing === "action" ? <Skeleton height={24} variant="circle" width={24} /> : null}
        {trailing === "badge" ? <Skeleton className={styles.badge} height={28} width={48} /> : null}
      </div>
    </div>
  );
}

export interface ListSkeletonProps extends Omit<ListRowSkeletonProps, "index"> {
  className?: string | undefined;
  count?: number | undefined;
}

/** A loading list: `count` row placeholders announced once as "Loading…". */
export function ListSkeleton({ className, count = 3, ...rowProps }: ListSkeletonProps) {
  const { t } = useI18n();

  return (
    <div
      aria-busy="true"
      aria-label={t("ui.loading")}
      className={classNames(styles.list, className)}
      role="status"
    >
      {Array.from({ length: count }, (_, index) => (
        <ListRowSkeleton key={index} {...rowProps} index={index} />
      ))}
    </div>
  );
}
