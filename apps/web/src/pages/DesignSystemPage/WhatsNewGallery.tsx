import { ReleaseNotesList } from "../../features/app-shell/whats-new/ReleaseNotesList";
import styles from "./DesignSystemPage.module.css";

/** What's new, as the settings menu shows it behind its version button. */
export function WhatsNewGallery() {
  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">What&apos;s new</h2>
      <ReleaseNotesList />
    </section>
  );
}
