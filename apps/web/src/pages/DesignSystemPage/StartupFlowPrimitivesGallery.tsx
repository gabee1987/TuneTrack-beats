import { PRACTICE_COVER_PATH_PREFIX } from "@tunetrack/shared/client";
import { useState } from "react";
import { resolveArtworkUrl } from "../../features/ui/resolveArtworkUrl";
import {
  Button,
  Card,
  CoverArt,
  ListRow,
  ListRowAction,
  NumberStepper,
  SegmentedControl,
  SelectionActionBar,
  SettingRow,
  Sheet,
  TextField,
} from "../../features/ui/primitives";
import styles from "./DesignSystemPage.module.css";

const SAMPLE_COVERS = ["Test Artist A", "Test Artist B", "Test Artist C", "Test Artist D"].map(
  (artist) =>
    resolveArtworkUrl({
      artist,
      artworkUrl: `${PRACTICE_COVER_PATH_PREFIX}sample`,
      title: "Test Song",
    }) ?? "",
);

/** The primitives added for the game startup flow (`22` §8), in every variant and state. */
export function StartupFlowPrimitivesGallery() {
  const [roomCode, setRoomCode] = useState("");
  const [winTarget, setWinTarget] = useState(10);
  const [revealMode, setRevealMode] = useState<"host" | "either">("host");
  const [addedRows, setAddedRows] = useState<ReadonlySet<string>>(() => new Set(["Song B"]));
  const [selectedCount, setSelectedCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const toggleRow = (title: string) =>
    setAddedRows((current) => {
      const next = new Set(current);
      if (!next.delete(title)) next.add(title);
      return next;
    });

  return (
    <>
      <section className={styles.section}>
        <h2 className="typeTitleMd">Button additions</h2>
        <div className={styles.row}>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="spotify">Log in with Spotify</Button>
          <Button isLoading>Starting</Button>
          <Button isLoading variant="spotify">
            Log in with Spotify
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Text field</h2>
        <TextField
          autoCapitalize="characters"
          helper="Ask the host for the code."
          label="Room code"
          onChange={(event) => setRoomCode(event.target.value)}
          trailing={<Button variant="tertiary">Paste</Button>}
          value={roomCode}
        />
        <TextField error="No room with this code." label="Room code" readOnly value="TEST_ROOM_9" />
        <TextField disabled label="Your name" value="Player One" />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Setting rows & stepper</h2>
        <Card>
          <SettingRow description="The first to collect this many cards wins." title="Cards to win">
            <NumberStepper
              label="Cards to win"
              max={30}
              min={3}
              onChange={setWinTarget}
              value={winTarget}
            />
          </SettingRow>
          <SettingRow description="Desktop: the value is editable." title="Cards to win (desktop)">
            <NumberStepper
              isEditable
              label="Cards to win"
              max={30}
              min={3}
              onChange={setWinTarget}
              value={winTarget}
            />
          </SettingRow>
          <SettingRow title="Who confirms the reveal">
            <SegmentedControl
              aria-label="Who confirms the reveal"
              onChange={setRevealMode}
              options={[
                { label: "Host", value: "host" },
                { label: "Either", value: "either" },
              ]}
              value={revealMode}
            />
          </SettingRow>
          <SettingRow title="Disabled stepper">
            <NumberStepper
              disabled
              label="Starting cards"
              max={5}
              min={1}
              onChange={() => {}}
              value={1}
            />
          </SettingRow>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Cover art</h2>
        <div className={styles.row}>
          <CoverArt label="Test Playlist" size="sm" src={SAMPLE_COVERS[0]} />
          <CoverArt label="Test Playlist" size="md" src={SAMPLE_COVERS[1]} />
          <CoverArt label="Test Playlist" size="lg" mosaic={SAMPLE_COVERS} />
          <CoverArt label="Test Playlist" size="hero" src={SAMPLE_COVERS[2]} />
        </div>
        <div className={styles.row}>
          {["Party Mix", "Road Trip", "Rock Classics", "Eighties Hits"].map((label) => (
            <CoverArt key={label} label={label} size="md" />
          ))}
          <CoverArt label="Broken Cover" size="md" src="https://images.example.test/missing.jpg" />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">List row actions & selection</h2>
        <Card>
          {["Song A", "Song B"].map((title, index) => {
            const isAdded = addedRows.has(title);
            return (
              <ListRow
                key={title}
                leading={<CoverArt label={title} size="sm" src={SAMPLE_COVERS[index]} />}
                subtitle="Test Artist · 1986"
                title={title}
                trailing={
                  <ListRowAction
                    aria-label={`Add ${title}`}
                    kind={isAdded ? "added" : "add"}
                    onClick={() => toggleRow(title)}
                  />
                }
              />
            );
          })}
          <ListRow
            subtitle="Labelled (desktop)"
            title="Song C"
            trailing={<ListRowAction isLabelVisible kind="add" />}
          />
          <ListRow subtitle="Remove" title="Song D" trailing={<ListRowAction kind="remove" />} />
          <ListRow
            subtitle="Open"
            title="Test Playlist"
            trailing={<ListRowAction kind="chevron" />}
          />
          <ListRow subtitle="More" title="Test Playlist" trailing={<ListRowAction kind="more" />} />
        </Card>
        <div className={styles.row}>
          <Button onClick={() => setSelectedCount((count) => count + 1)} variant="secondary">
            Select one more
          </Button>
          <Button onClick={() => setSelectedCount(0)} variant="ghost">
            Clear selection
          </Button>
        </div>
        <SelectionActionBar
          count={selectedCount}
          destructiveAction={{ label: "Remove", onClick: () => setSelectedCount(0) }}
          primaryAction={{ label: "Add to game", onClick: () => setSelectedCount(0) }}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Sheet</h2>
        <Button onClick={() => setIsSheetOpen(true)} variant="secondary">
          Open sheet
        </Button>
        <Sheet
          dock={
            <Button fullWidth haptic onClick={() => setIsSheetOpen(false)} size="lg">
              Use in game
            </Button>
          }
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          onDone={() => setIsSheetOpen(false)}
          title="Music"
        >
          <p className="typeBody">
            Full screen on phones, a side sheet on wide screens. The body scrolls; the dock stays
            above the home indicator.
          </p>
        </Sheet>
      </section>
    </>
  );
}
