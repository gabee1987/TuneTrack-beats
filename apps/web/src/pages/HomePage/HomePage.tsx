import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShellMenu } from "../../features/app-shell/AppShellMenu";
import { rememberPlayerDisplayName } from "../../services/session/playerSession";
import styles from "./HomePage.module.css";

export function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("party-room");
  const [displayName, setDisplayName] = useState("Player 1");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedRoomId = roomId.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedRoomId || !trimmedDisplayName) {
      return;
    }

    rememberPlayerDisplayName(trimmedDisplayName);

    navigate(
      `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
        trimmedDisplayName,
      )}`,
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <div className={styles.menuRow}>
          <AppShellMenu
            subtitle="Local preferences and future app controls live here."
            tabs={[
              {
                id: "view",
                label: "View",
                content: (
                  <p className={styles.menuPlaceholder}>
                    Gameplay visibility controls will appear here as the final
                    mobile shell takes shape.
                  </p>
                ),
              },
              {
                id: "settings",
                label: "Settings",
                content: (
                  <p className={styles.menuPlaceholder}>
                    Theme and hidden-card preferences are ready for testing now.
                  </p>
                ),
              },
            ]}
            title="TuneTrack menu"
          />
        </div>
        <h1 className={styles.title}>TuneTrack beats</h1>
        <p className={styles.subtitle}>
          Join a room, listen together, and build your music timeline.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Room code
            <input
              className={styles.input}
              onChange={(event) => setRoomId(event.target.value)}
              type="text"
              value={roomId}
            />
          </label>

          <label className={styles.field}>
            Player name
            <input
              className={styles.input}
              onChange={(event) => setDisplayName(event.target.value)}
              type="text"
              value={displayName}
            />
          </label>

          <button className={styles.button} type="submit">
            Join Game Room
          </button>
        </form>
      </section>
    </main>
  );
}
