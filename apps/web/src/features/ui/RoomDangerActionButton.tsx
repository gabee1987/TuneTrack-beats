import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useI18n } from "../i18n";
import { ActionButton } from "./ActionButton";
import styles from "./RoomDangerActionButton.module.css";

interface RoomDangerActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string | undefined;
}

export function RoomDangerActionButton({
  children,
  className,
  ...props
}: RoomDangerActionButtonProps) {
  const { t } = useI18n();

  return (
    <ActionButton
      {...props}
      className={`${styles.dangerAction}${className ? ` ${className}` : ""}`}
      variant="danger"
    >
      {children ?? t("lobby.actions.closeRoom")}
    </ActionButton>
  );
}
