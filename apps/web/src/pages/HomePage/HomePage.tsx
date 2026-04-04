import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
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

    navigate(
      `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
        trimmedDisplayName,
      )}`,
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
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
            Join Room
          </button>
        </form>
      </section>
    </main>
  );
}
