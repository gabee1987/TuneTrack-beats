import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { HomePageHero } from "./components/HomePageHero";
import { JoinRoomForm } from "./components/JoinRoomForm";
import { HomePageTopBar } from "./components/HomePageTopBar";
import { useHomePageController } from "./hooks/useHomePageController";
import styles from "./HomePage.module.css";

export function HomePage() {
  const {
    displayName,
    handleSubmit,
    roomId,
    setDisplayName,
    setRoomId,
  } = useHomePageController();

  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
      <HomePageTopBar />

      <div className={styles.contentGrid}>
        <HomePageHero />
        <JoinRoomForm
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onRoomIdChange={setRoomId}
          onSubmit={handleSubmit}
          roomId={roomId}
        />
      </div>
    </AppPageShell>
  );
}
