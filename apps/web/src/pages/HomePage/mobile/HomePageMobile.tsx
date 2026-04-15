import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import type { HomePageAssemblyProps } from "../HomePage.types";
import { HomePageHero } from "../components/HomePageHero";
import { JoinRoomForm } from "../components/JoinRoomForm";
import { HomePageTopBar } from "../components/HomePageTopBar";
import styles from "./HomePageMobile.module.css";

export function HomePageMobile({ controller }: HomePageAssemblyProps) {
  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
      <HomePageTopBar />

      <div className={styles.contentGrid}>
        <HomePageHero />
        <JoinRoomForm
          displayName={controller.displayName}
          onDisplayNameChange={controller.setDisplayName}
          onRoomIdChange={controller.setRoomId}
          onSubmit={controller.handleSubmit}
          roomId={controller.roomId}
        />
      </div>
    </AppPageShell>
  );
}
