import { useState, type ReactNode } from "react";
import { MotionDialogPortal } from "../motion";
import { useI18n } from "../i18n";
import { CloseIconButton } from "./CloseIconButton";
import styles from "./SettingField.module.css";

interface SettingFieldProps {
  children: ReactNode;
  className?: string | undefined;
  info?: ReactNode;
  label: string;
  value?: ReactNode;
}

export function SettingField({ children, className, info, label, value }: SettingFieldProps) {
  return (
    <div className={`${styles.field}${className ? ` ${className}` : ""}`}>
      <div className={styles.labelRow}>
        <span className={styles.labelWithInfo}>
          <span>{label}</span>
          {info ? <SettingInfoButton info={info} label={label} /> : null}
        </span>
        {value !== undefined && value !== null ? (
          <strong className={styles.value}>{value}</strong>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface SettingInfoButtonProps {
  info: ReactNode;
  label: string;
}

function InfoGlyph() {
  return (
    <svg aria-hidden="true" className={styles.infoGlyph} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 10.5V16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="7.5" fill="currentColor" r="1.25" />
    </svg>
  );
}

export function SettingInfoButton({ info, label }: SettingInfoButtonProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={styles.infoWrap}>
      <button
        aria-label={`${label} ${t("lobby.info.title").toLowerCase()}`}
        className={styles.infoButton}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
        type="button"
      >
        <InfoGlyph />
      </button>
      <MotionDialogPortal
        cardClassName={styles.infoCard}
        isOpen={isOpen}
        label={label}
        onClose={() => setIsOpen(false)}
        overlayClassName={styles.infoOverlay}
      >
        <CloseIconButton
          ariaLabel={t("lobby.info.close")}
          className={styles.infoCloseButton}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
          }}
          size="sm"
        />
        <div className={styles.infoScroll}>
          <span className={styles.infoEyebrow}>{t("lobby.info.title")}</span>
          <span className={styles.infoTitle}>{label}</span>
          <span className={styles.infoBody}>{info}</span>
        </div>
      </MotionDialogPortal>
    </span>
  );
}
