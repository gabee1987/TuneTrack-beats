import { useState } from "react";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { useUiPreferencesStore } from "../../features/preferences/uiPreferences";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipButton,
  Dialog,
  EmptyState,
  IconButton,
  ListRow,
  ListRowButton,
  SegmentedControl,
  Skeleton,
} from "../../features/ui/primitives";
import { Badge } from "../../features/ui/Badge";
import styles from "./DesignSystemPage.module.css";

type ThemeChoice = "dark" | "light";

export function DesignSystemPage() {
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);
  const [selectedChip, setSelectedChip] = useState("rock");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <AppPageShell screenClassName={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>DEV ONLY</p>
        <h1 className={`typeTitleLg ${styles.heading}`}>Design system</h1>
        <p className="typeBody">
          Token-driven primitives for the Spotify-inspired UI overhaul. Not linked from
          production navigation.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Theme</h2>
        <SegmentedControl<ThemeChoice>
          aria-label="Theme"
          onChange={setTheme}
          options={[
            { label: "Dark", value: "dark" },
            { label: "Light", value: "light" },
          ]}
          value={theme}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Buttons</h2>
        <div className={styles.row}>
          <Button haptic>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <Button fullWidth size="lg" haptic>
          Full width large
        </Button>
        <div className={styles.row}>
          <IconButton aria-label="Close sample">
            <CloseGlyph />
          </IconButton>
          <IconButton aria-label="Ghost icon" variant="ghost">
            <CloseGlyph />
          </IconButton>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Chips & badges</h2>
        <div className={styles.row}>
          <Chip>Neutral</Chip>
          <ChipButton
            onClick={() => setSelectedChip("rock")}
            selected={selectedChip === "rock"}
          >
            Rock
          </ChipButton>
          <ChipButton
            onClick={() => setSelectedChip("pop")}
            selected={selectedChip === "pop"}
          >
            Pop
          </ChipButton>
          <Badge variant="connected">Connected</Badge>
          <Badge variant="strong">Strong</Badge>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Card & list</h2>
        <Card>
          <p className={styles.cardTitle}>Flat card</p>
          <p className="typeCaption">Uses surface + border tokens, no heavy glass.</p>
        </Card>
        <Card elevated>
          <ListRow
            leading={<Avatar initials="TT" />}
            subtitle="Host · 3 cards"
            title="TuneTrack Player"
            trailing={<Badge size="sm">You</Badge>}
          />
          <ListRowButton
            leading={<Avatar initials="AK" size="sm" />}
            onClick={() => undefined}
            subtitle="Waiting"
            title="Alex"
          />
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Skeleton & empty</h2>
        <div className={styles.row}>
          <Skeleton height={48} variant="circle" width={48} />
          <div className={styles.skeletonStack}>
            <Skeleton height={14} variant="text" width="70%" />
            <Skeleton height={14} variant="text" width="45%" />
          </div>
        </div>
        <EmptyState
          action={<Button size="md">Browse rooms</Button>}
          description="When a list has no items, use EmptyState with one clear action."
          title="No open rooms"
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Dialog</h2>
        <Button onClick={() => setIsDialogOpen(true)} variant="secondary">
          Open dialog
        </Button>
        <Dialog
          actions={
            <>
              <Button onClick={() => setIsDialogOpen(false)} variant="ghost">
                Cancel
              </Button>
              <Button haptic onClick={() => setIsDialogOpen(false)}>
                Confirm
              </Button>
            </>
          }
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Confirm action"
        >
          <p className="typeBody">
            Dialogs are for blocking confirmations. Prefer bottom sheets for contextual
            content on mobile.
          </p>
        </Dialog>
      </section>
    </AppPageShell>
  );
}

function CloseGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
