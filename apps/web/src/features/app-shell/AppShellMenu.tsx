import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, type ReactNode } from "react";
import {
  useUiPreferencesStore,
  type HiddenCardMode,
  type MenuTabId,
  type ThemeId,
} from "../preferences/uiPreferences";
import styles from "./AppShellMenu.module.css";

export interface AppShellMenuTab {
  id: MenuTabId;
  label: string;
  content: ReactNode;
}

interface AppShellMenuProps {
  title: string;
  subtitle: string;
  tabs: AppShellMenuTab[];
}

export function AppShellMenu({ title, subtitle, tabs }: AppShellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useUiPreferencesStore((state) => state.theme);
  const setTheme = useUiPreferencesStore((state) => state.setTheme);
  const hiddenCardMode = useUiPreferencesStore((state) => state.hiddenCardMode);
  const setHiddenCardMode = useUiPreferencesStore(
    (state) => state.setHiddenCardMode,
  );
  const view = useUiPreferencesStore((state) => state.view);
  const updateViewPreferences = useUiPreferencesStore(
    (state) => state.updateViewPreferences,
  );
  const showDevCardInfo = useUiPreferencesStore(
    (state) => state.showDevCardInfo,
  );
  const showDevAlbumInfo = useUiPreferencesStore(
    (state) => state.showDevAlbumInfo,
  );
  const showDevGenreInfo = useUiPreferencesStore(
    (state) => state.showDevGenreInfo,
  );
  const setDevVisibility = useUiPreferencesStore(
    (state) => state.setDevVisibility,
  );
  const lastOpenedMenuTab = useUiPreferencesStore(
    (state) => state.lastOpenedMenuTab,
  );
  const setLastOpenedMenuTab = useUiPreferencesStore(
    (state) => state.setLastOpenedMenuTab,
  );

  const availableTabs = useMemo(() => tabs, [tabs]);
  const activeTabId = availableTabs.some((tab) => tab.id === lastOpenedMenuTab)
    ? lastOpenedMenuTab
    : availableTabs[0]?.id;
  const activeTab = availableTabs.find((tab) => tab.id === activeTabId) ?? null;

  return (
    <>
      <button
        className={styles.menuTrigger}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Menu
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            className={styles.menuOverlay}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.aside
              animate={{ x: 0, y: 0 }}
              className={styles.menuSheet}
              exit={{
                x: window.matchMedia("(max-width: 720px)").matches ? 0 : 32,
                y: window.matchMedia("(max-width: 720px)").matches ? 32 : 0,
              }}
              initial={{
                x: window.matchMedia("(max-width: 720px)").matches ? 0 : 32,
                y: window.matchMedia("(max-width: 720px)").matches ? 32 : 0,
              }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <header className={styles.menuHeader}>
                <div>
                  <h2 className={styles.menuTitle}>{title}</h2>
                  <p className={styles.menuSubtitle}>{subtitle}</p>
                </div>
                <button
                  className={styles.menuCloseButton}
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </header>

              <nav className={styles.tabRow}>
                {availableTabs.map((tab) => (
                  <button
                    className={`${styles.tabButton} ${
                      tab.id === activeTabId ? styles.tabButtonActive : ""
                    }`}
                    key={tab.id}
                    onClick={() => setLastOpenedMenuTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <section className={styles.panel}>
                {activeTab?.id === "view" ? (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>View preferences</h3>
                    <p className={styles.sectionDescription}>
                      Tune the amount of information you want to keep on screen.
                    </p>
                    <div className={styles.fieldGroup}>
                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show mini standings
                          </span>
                          <span className={styles.toggleHint}>
                            Keep the future top-3 strip ready without forcing it on.
                          </span>
                        </div>
                        <input
                          checked={view.showMiniStandings}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showMiniStandings: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show helper labels
                          </span>
                          <span className={styles.toggleHint}>
                            Keep small supporting labels visible while the final UI is evolving.
                          </span>
                        </div>
                        <input
                          checked={view.showHelperLabels}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showHelperLabels: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show timeline hints
                          </span>
                          <span className={styles.toggleHint}>
                            Helpful while we transition to the final timeline-first UX.
                          </span>
                        </div>
                        <input
                          checked={view.showTimelineHints}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showTimelineHints: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show room code
                          </span>
                          <span className={styles.toggleHint}>
                            Keep the room chip visible in the top bar when you need it.
                          </span>
                        </div>
                        <input
                          checked={view.showRoomCodeChip}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showRoomCodeChip: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show phase
                          </span>
                          <span className={styles.toggleHint}>
                            Show the current game phase as a compact top-bar chip.
                          </span>
                        </div>
                        <input
                          checked={view.showPhaseChip}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showPhaseChip: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>

                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>
                            Show turn number
                          </span>
                          <span className={styles.toggleHint}>
                            Keep the current round number visible in the top bar.
                          </span>
                        </div>
                        <input
                          checked={view.showTurnNumberChip}
                          className={styles.checkbox}
                          onChange={(event) =>
                            updateViewPreferences({
                              showTurnNumberChip: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>
                    </div>
                  </div>
                ) : activeTab?.id === "settings" ? (
                  <>
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Theme</h3>
                      <p className={styles.sectionDescription}>
                        Choose the look you prefer on this device.
                      </p>
                      <div className={styles.segmentedRow}>
                        <ThemeButton
                          activeTheme={theme}
                          onClick={setTheme}
                          themeId="dark"
                        />
                        <ThemeButton
                          activeTheme={theme}
                          onClick={setTheme}
                          themeId="light"
                        />
                      </div>
                    </div>

                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>Hidden card style</h3>
                      <p className={styles.sectionDescription}>
                        Prepare how unrevealed cards should look in the final game shell.
                      </p>
                      <div className={styles.segmentedRow}>
                        <HiddenCardModeButton
                          activeMode={hiddenCardMode}
                          mode="artwork"
                          onClick={setHiddenCardMode}
                        />
                        <HiddenCardModeButton
                          activeMode={hiddenCardMode}
                          mode="gradient"
                          onClick={setHiddenCardMode}
                        />
                      </div>
                      <div className={styles.hiddenCardPreview}>
                        <div
                          className={`${styles.hiddenCardPreviewFace} ${
                            hiddenCardMode === "gradient"
                              ? styles.hiddenCardPreviewGradient
                              : styles.hiddenCardPreviewArtwork
                          }`}
                        >
                          <span className={styles.hiddenCardPreviewLabel}>
                            Hidden card preview
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeTab?.id === "dev" ? (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Developer helpers</h3>
                    <p className={styles.sectionDescription}>
                      Keep these local to your browser while testing card states.
                    </p>
                    <div className={styles.fieldGroup}>
                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>Song info</span>
                        </div>
                        <input
                          checked={showDevCardInfo}
                          className={styles.checkbox}
                          onChange={(event) =>
                            setDevVisibility({
                              showDevCardInfo: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>
                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>Album info</span>
                        </div>
                        <input
                          checked={showDevAlbumInfo}
                          className={styles.checkbox}
                          onChange={(event) =>
                            setDevVisibility({
                              showDevAlbumInfo: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>
                      <label className={styles.toggleField}>
                        <div className={styles.toggleCopy}>
                          <span className={styles.toggleLabel}>Genre info</span>
                        </div>
                        <input
                          checked={showDevGenreInfo}
                          className={styles.checkbox}
                          onChange={(event) =>
                            setDevVisibility({
                              showDevGenreInfo: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  activeTab?.content
                )}
              </section>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ThemeButton({
  themeId,
  activeTheme,
  onClick,
}: {
  themeId: ThemeId;
  activeTheme: ThemeId;
  onClick: (theme: ThemeId) => void;
}) {
  return (
    <button
      className={`${styles.segmentedButton} ${
        activeTheme === themeId ? styles.segmentedButtonActive : ""
      }`}
      onClick={() => onClick(themeId)}
      type="button"
    >
      {themeId === "dark" ? "Dark" : "Light"}
    </button>
  );
}

function HiddenCardModeButton({
  mode,
  activeMode,
  onClick,
}: {
  mode: HiddenCardMode;
  activeMode: HiddenCardMode;
  onClick: (mode: HiddenCardMode) => void;
}) {
  return (
    <button
      className={`${styles.segmentedButton} ${
        activeMode === mode ? styles.segmentedButtonActive : ""
      }`}
      onClick={() => onClick(mode)}
      type="button"
    >
      {mode === "artwork" ? "Artwork" : "Gradient"}
    </button>
  );
}
