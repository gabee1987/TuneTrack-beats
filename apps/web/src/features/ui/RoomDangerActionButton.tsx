import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ActionButton } from "./ActionButton";
import styles from "./RoomDangerActionButton.module.css";

interface RoomDangerActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string | undefined;
}

export function RoomDangerActionButton({
  children = "Close Room",
  className,
  ...props
}: RoomDangerActionButtonProps) {
  return (
    <ActionButton
      {...props}
      className={`${styles.dangerAction}${className ? ` ${className}` : ""}`}
      variant="danger"
    >
      {children}
    </ActionButton>
  );
}
