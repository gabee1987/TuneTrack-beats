import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./SettingField.module.css";

interface SettingFieldProps {
  children: ReactNode;
  className?: string | undefined;
  info?: ReactNode;
  label: string;
  value?: ReactNode;
}

export function SettingField({
  children,
  className,
  info,
  label,
  value,
}: SettingFieldProps) {
  return (
    <label className={`${styles.field}${className ? ` ${className}` : ""}`}>
      <div className={styles.labelRow}>
        <span className={styles.labelWithInfo}>
          <span>{label}</span>
          {info ? <SettingInfoButton info={info} label={label} /> : null}
        </span>
        {value ? <strong className={styles.value}>{value}</strong> : null}
      </div>
      {children}
    </label>
  );
}

interface SettingInfoButtonProps {
  info: ReactNode;
  label: string;
}

export function SettingInfoButton({ info, label }: SettingInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modal = isOpen
    ? createPortal(
        <span
          className={styles.infoOverlay}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
          }}
          role="presentation"
        >
          <span
            aria-label={label}
            aria-modal="true"
            className={styles.infoCard}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            role="dialog"
          >
            <span className={styles.infoHeaderRow}>
              <span className={styles.infoEyebrow}>Info</span>
              <button
                aria-label="Close info"
                className={styles.infoCloseButton}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                }}
                type="button"
              >
                ×
              </button>
            </span>
            <span className={styles.infoTitle}>{label}</span>
            <span className={styles.infoBody}>{info}</span>
          </span>
        </span>,
        document.body,
      )
    : null;

  return (
    <span className={styles.infoWrap}>
      <button
        aria-label={`${label} info`}
        className={styles.infoButton}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
        type="button"
      >
        i
      </button>
      {modal}
    </span>
  );
}
