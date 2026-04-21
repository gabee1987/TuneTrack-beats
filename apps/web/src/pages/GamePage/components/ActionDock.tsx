import styles from "./GamePageActionPanels.module.css";

interface ActionDockProps {
  children: React.ReactNode;
}

export function ActionDock({ children }: ActionDockProps) {
  return <div className={styles.floatingActionDock}>{children}</div>;
}

interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  ttCost?: number;
}

export function PrimaryActionButton({
  children,
  onClick,
  ttCost,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingPrimaryButton}
      onClick={onClick}
      type="button"
    >
      <span className={styles.actionButtonLabel}>{children}</span>
      {ttCost ? <span className={styles.ttCostBadge}>{ttCost} TT</span> : null}
    </button>
  );
}

export function SecondaryActionButton({
  children,
  onClick,
  ttCost,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingSecondaryButton}
      onClick={onClick}
      type="button"
    >
      <span className={styles.actionButtonLabel}>{children}</span>
      {ttCost ? <span className={styles.ttCostBadge}>{ttCost} TT</span> : null}
    </button>
  );
}
