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
}

export function PrimaryActionButton({
  children,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingPrimaryButton}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function SecondaryActionButton({
  children,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      className={styles.floatingSecondaryButton}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
