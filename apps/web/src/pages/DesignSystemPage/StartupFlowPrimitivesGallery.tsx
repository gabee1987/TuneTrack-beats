import { useState } from "react";
import {
  Button,
  Card,
  ChipButton,
  CoverArt,
  FloatingBar,
  ListRow,
  ListRowAction,
  ListSkeleton,
  NumberStepper,
  PageHeader,
  SegmentedControl,
  SelectionActionBar,
  SettingRow,
  Sheet,
  TextField,
} from "../../features/ui/primitives";
import styles from "./DesignSystemPage.module.css";
import { SAMPLE_COVERS } from "./sampleCovers";

/** The primitives added for the game startup flow (`22` §8), in every variant and state. */
export function StartupFlowPrimitivesGallery() {
  const [roomCode, setRoomCode] = useState("");
  const [winTarget, setWinTarget] = useState(10);
  const [revealMode, setRevealMode] = useState<"host" | "either">("host");
  const [addedRows, setAddedRows] = useState<ReadonlySet<string>>(() => new Set(["Song B"]));
  const [selectedCount, setSelectedCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const toggleRow = (title: string) =>
    setAddedRows((current) => {
      const next = new Set(current);
      if (!next.delete(title)) next.add(title);
      return next;
    });

  return (
    <>
      <section className={styles.section}>
        <h2 className="typeTitleMd">Page header & floating bars</h2>
        <PageHeader
          backLabel="Back"
          eyebrow="Test Deck"
          meta="24 songs"
          onBack={() => undefined}
          title="Edit the songs"
        />
        <FloatingBar className={styles.row} edge="top">
          <ChipButton selected>All (24)</ChipButton>
          <ChipButton>Needs check (3)</ChipButton>
        </FloatingBar>
        <TextField label="Title (read-only)" readOnly value="Test Song" />
        <FloatingBar className={styles.row} edge="bottom">
          <Button fullWidth size="lg">
            Use these songs
          </Button>
        </FloatingBar>
      </section>

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
        <Button fullWidth isLoading loadingLabel="Setting up your room…" size="lg">
          Host a game
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Text field</h2>
        <TextField
          appearance="code"
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
          <SettingRow
            description="Stacked: the control takes the full width under the copy."
            isStacked
            title="Who confirms the reveal (stacked)"
          >
            <SegmentedControl
              aria-label="Who confirms the reveal (stacked)"
              onChange={setRevealMode}
              options={[
                { label: "Host", value: "host" },
                { label: "Host or player on turn", value: "either" },
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
        <h2 className="typeTitleMd">List row actions, skeleton & selection</h2>
        <SegmentedControl
          aria-label="List state"
          onChange={(state) => setIsListLoading(state === "loading")}
          options={[
            { label: "Loaded", value: "loaded" },
            { label: "Loading", value: "loading" },
          ]}
          value={isListLoading ? "loading" : "loaded"}
        />
        <Card>
          {isListLoading ? (
            <ListSkeleton count={6} trailing="action" />
          ) : (
            <LoadedRows addedRows={addedRows} onToggleRow={toggleRow} />
          )}
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
          actions={[
            { label: `Add ${selectedCount}`, onClick: () => setSelectedCount(0) },
            { label: "Remove 1", onClick: () => setSelectedCount(0), variant: "danger" },
          ]}
          count={selectedCount}
        />
      </section>

      <section className={styles.section}>
        <h2 className="typeTitleMd">Sheet</h2>
        <Button onClick={() => setIsSheetOpen(true)} variant="secondary">
          Open sheet
        </Button>
        <Sheet
          dock={
            <FloatingBar edge="bottom">
              <Button fullWidth haptic onClick={() => setIsSheetOpen(false)} size="lg">
                Use in game
              </Button>
            </FloatingBar>
          }
          eyebrow="Music"
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Choose the songs"
        >
          <p className="typeBody">
            Full screen on phones, a side sheet on wide screens. Back is the one way out; the body
            fades under the bar and the dock floats above the home indicator.
          </p>
        </Sheet>
      </section>
    </>
  );
}

interface LoadedRowsProps {
  addedRows: ReadonlySet<string>;
  onToggleRow: (title: string) => void;
}

/** The loaded list the skeleton stands in for: same rows, same leading cover, same action. */
function LoadedRows({ addedRows, onToggleRow }: LoadedRowsProps) {
  const fixedRows = [
    {
      title: "Song C",
      subtitle: "Labelled (desktop)",
      action: <ListRowAction isLabelVisible kind="add" />,
    },
    { title: "Song D", subtitle: "Remove", action: <ListRowAction kind="remove" /> },
    { title: "Test Playlist", subtitle: "Open", action: <ListRowAction kind="chevron" /> },
    { title: "Party Mix", subtitle: "More", action: <ListRowAction kind="more" /> },
  ];

  return (
    <>
      {["Song A", "Song B"].map((title, index) => (
        <ListRow
          key={title}
          leading={<CoverArt label={title} size="sm" src={SAMPLE_COVERS[index]} />}
          subtitle="Test Artist · 1986"
          title={title}
          trailing={
            <ListRowAction
              aria-label={`Add ${title}`}
              kind={addedRows.has(title) ? "added" : "add"}
              onClick={() => onToggleRow(title)}
            />
          }
        />
      ))}
      {fixedRows.map((row, index) => (
        <ListRow
          key={row.title}
          leading={<CoverArt label={row.title} size="sm" src={SAMPLE_COVERS[index + 2]} />}
          subtitle={row.subtitle}
          title={row.title}
          trailing={row.action}
        />
      ))}
    </>
  );
}
