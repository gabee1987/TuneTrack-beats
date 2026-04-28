import styles from "./TtToken.module.css";

interface TtTokenIconProps {
  className?: string | undefined;
}

export function TtTokenIcon({ className }: TtTokenIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${styles.tokenIcon}${className ? ` ${className}` : ""}`}
      draggable={false}
      src="/tt_icon.png"
    />
  );
}
