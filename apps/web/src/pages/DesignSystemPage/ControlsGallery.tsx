import { useState } from "react";
import { ActionButton } from "../../features/ui/ActionButton";
import { BottomSheet } from "../../features/ui/BottomSheet";
import { CloseIconButton } from "../../features/ui/CloseIconButton";
import { Button } from "../../features/ui/primitives";
import { RangeField } from "../../features/ui/RangeField";
import { RoomResetModal } from "../../features/ui/RoomResetModal";
import { SelectInput } from "../../features/ui/SelectInput";
import { SurfaceCard } from "../../features/ui/SurfaceCard";
import { TextInput } from "../../features/ui/TextInput";
import { ToggleField } from "../../features/ui/ToggleField";
import { ToggleSwitch } from "../../features/ui/ToggleSwitch";
import styles from "./DesignSystemPage.module.css";

/**
 * The switch and slider that stay (decision 26), then the controls `22` replaces; each of
 * those leaves this page in the package that deletes it.
 */
export function ControlsGallery() {
  const [isTokensOn, setIsTokensOn] = useState(true);
  const [isCompactOn, setIsCompactOn] = useState(false);
  const [winTarget, setWinTarget] = useState(10);
  const [startingCards, setStartingCards] = useState(1);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  return (
    <>
      <section className={styles.section}>
        <h2 className="typeTitleMd">Switches</h2>
        <div className={styles.row}>
          <ToggleSwitch ariaLabel="Tokens" checked={isTokensOn} onChange={setIsTokensOn} />
          <ToggleSwitch
            ariaLabel="Compact switch"
            checked={isCompactOn}
            onChange={setIsCompactOn}
            size="compact"
          />
          <ToggleSwitch ariaLabel="Disabled switch" checked disabled onChange={() => {}} />
        </div>
        <ToggleField
          checked={isTokensOn}
          hint="Spend tokens to skip, buy or Beat! a song."
          label="Tokens"
          onChange={setIsTokensOn}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Ruler slider (phones)</h2>
        <RangeField
          label="Cards to win"
          max={30}
          min={3}
          onChange={setWinTarget}
          value={winTarget}
        />
        <RangeField
          density="compact"
          label="Starting cards"
          max={5}
          min={1}
          onChange={setStartingCards}
          value={startingCards}
        />
        <RangeField disabled label="Disabled" max={5} min={1} onChange={() => {}} value={2} />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Being replaced (`22` S2–S12)</h2>
        <SurfaceCard>
          <div className={styles.stack}>
            <div className={styles.row}>
              <ActionButton>ActionButton</ActionButton>
              <ActionButton variant="neutral">Neutral</ActionButton>
              <ActionButton variant="danger">Danger</ActionButton>
              <CloseIconButton ariaLabel="Close sample" onClick={() => {}} />
            </div>
            <TextInput aria-label="TextInput sample" placeholder="TextInput" />
            <SelectInput aria-label="SelectInput sample" defaultValue="host">
              <option value="host">Host</option>
              <option value="either">Host or player on turn</option>
            </SelectInput>
            <div className={styles.row}>
              <Button onClick={() => setIsBottomSheetOpen(true)} variant="secondary">
                BottomSheet
              </Button>
              <Button onClick={() => setIsResetOpen(true)} variant="secondary">
                Room closed modal
              </Button>
            </div>
          </div>
        </SurfaceCard>
        <BottomSheet
          isOpen={isBottomSheetOpen}
          label="Bottom sheet sample"
          onClose={() => setIsBottomSheetOpen(false)}
        >
          <p className="typeBody">Replaced by `Sheet`.</p>
        </BottomSheet>
        <RoomResetModal
          isOpen={isResetOpen}
          onReset={() => setIsResetOpen(false)}
          reason="closed"
        />
      </section>
    </>
  );
}
