import { useState } from "react";
import { IdentityChip } from "../../features/profile/IdentityChip";
import { NameSheet } from "../../features/profile/NameSheet";
import { Button } from "../../features/ui/primitives";
import styles from "./DesignSystemPage.module.css";

/** Who is playing: the identity chip and the Name sheet it opens (`22` §4.2). */
export function ProfileGallery() {
  const [displayName, setDisplayName] = useState("Player One");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <section className={styles.section}>
      <h2 className="typeTitleMd">Identity chip & Name sheet</h2>
      <div className={styles.row}>
        <IdentityChip displayName={displayName} onChange={() => setIsSheetOpen(true)} />
        <IdentityChip disabled displayName="Player With A Long Name" onChange={() => {}} />
      </div>
      <div className={styles.row}>
        <Button onClick={() => setIsSheetOpen(true)} variant="secondary">
          Open Name sheet
        </Button>
      </div>
      <NameSheet
        initialName={displayName}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onSave={(name) => {
          setDisplayName(name);
          setIsSheetOpen(false);
        }}
      />
    </section>
  );
}
