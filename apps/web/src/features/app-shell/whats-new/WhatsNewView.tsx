import { useI18n } from "../../i18n";
import { PanelView } from "../../overlay";
import { PageHeader } from "../../ui/primitives";
import { ReleaseNotesList } from "./ReleaseNotesList";
import styles from "./WhatsNewView.module.css";

interface WhatsNewViewProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The release notes, as a view over the settings menu; Back returns to the menu. */
export function WhatsNewView({ isOpen, onClose }: WhatsNewViewProps) {
  const { t } = useI18n();

  return (
    <PanelView isOpen={isOpen} label={t("whatsNew.title")} onDismiss={onClose}>
      <div className={styles.header}>
        <PageHeader
          backLabel={t("common.back")}
          eyebrow={t("whatsNew.eyebrow")}
          onBack={onClose}
          title={t("whatsNew.title")}
        />
      </div>
      <div className={styles.body}>
        <ReleaseNotesList />
      </div>
    </PanelView>
  );
}
