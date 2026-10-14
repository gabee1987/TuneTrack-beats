import type { ButtonHTMLAttributes } from "react";
import { useI18n } from "../../i18n";
import { classNames } from "../classNames";
import styles from "./ListRowAction.module.css";

export type ListRowActionKind = "add" | "added" | "chevron" | "more" | "remove";

const LABEL_KEYS = {
  add: "ui.listRowAction.add",
  added: "ui.listRowAction.added",
  chevron: "ui.listRowAction.open",
  more: "ui.listRowAction.more",
  remove: "ui.listRowAction.remove",
} as const satisfies Record<ListRowActionKind, string>;

export interface ListRowActionProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Names the row too ("Add Song A"); without it the action's own word is used. */
  "aria-label"?: string | undefined;
  /** Desktop shows the word beside the icon; phones show the icon alone. */
  isLabelVisible?: boolean | undefined;
  kind: ListRowActionKind;
}

/** The trailing action of a `ListRow`: one 48 px target with a fixed set of meanings. */
export function ListRowAction({
  "aria-label": ariaLabel,
  className,
  isLabelVisible = false,
  kind,
  type = "button",
  ...props
}: ListRowActionProps) {
  const { t } = useI18n();
  const word = t(LABEL_KEYS[kind]);
  const isToggle = kind === "add" || kind === "added";

  return (
    <button
      {...props}
      aria-label={isLabelVisible && !ariaLabel ? undefined : (ariaLabel ?? word)}
      aria-pressed={isToggle ? kind === "added" : undefined}
      className={classNames(
        styles.action,
        kind === "added" ? styles.added : undefined,
        kind === "remove" ? styles.remove : undefined,
        isLabelVisible ? styles.withLabel : undefined,
        className,
      )}
      type={type}
    >
      <ActionGlyph kind={kind} />
      {isLabelVisible ? <span>{word}</span> : null}
    </button>
  );
}

const GLYPH_PATHS: Record<ListRowActionKind, string> = {
  add: "M12 5V19M5 12H19",
  added: "M5 12.5L10 17.5L19 7",
  chevron: "M9 6L15 12L9 18",
  more: "M12 6H12.01M12 12H12.01M12 18H12.01",
  remove: "M6 6L18 18M18 6L6 18",
};

function ActionGlyph({ kind }: { kind: ListRowActionKind }) {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d={GLYPH_PATHS[kind]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={kind === "more" ? 3 : 2}
      />
    </svg>
  );
}
