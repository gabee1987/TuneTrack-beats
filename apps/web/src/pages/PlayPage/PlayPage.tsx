import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { useI18n } from "../../features/i18n";
import { TextInput } from "../../features/ui/TextInput";
import { Button, EmptyState } from "../../features/ui/primitives";
import { usePlayPageController } from "./hooks/usePlayPageController";
import styles from "./PlayPage.module.css";

export function PlayPage() {
  const { t } = useI18n();
  const controller = usePlayPageController();

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <main className={styles.content}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t("home.roomEntryTitle")}</p>
          <h1 className={styles.title}>{t("play.title")}</h1>
          <p className={styles.subtitle}>{t("home.roomEntryDescription")}</p>
        </header>

        <section className={styles.setupCard}>
          <form className={styles.form} onSubmit={controller.handleCreateRoomSubmit}>
            <div className={styles.sectionHeader}>
              <h2>{t("home.createRoomAction")}</h2>
              <p>{t("play.createDescription")}</p>
            </div>

            <label className={styles.field}>
              <span className={styles.labelRow}>{t("home.createRoomCodeLabel")}</span>
              <TextInput
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                inputMode="text"
                onChange={(event) => controller.setCreateRoomId(event.target.value)}
                placeholder={t("home.roomCodePlaceholder")}
                value={controller.createRoomId}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>{t("home.playerNameLabel")}</span>
              <TextInput
                autoComplete="nickname"
                maxLength={24}
                onChange={(event) => controller.setDisplayName(event.target.value)}
                placeholder={t("home.playerNamePlaceholder")}
                value={controller.displayName}
              />
            </label>

            <Button
              fullWidth
              haptic
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              size="lg"
              type="submit"
            >
              {t("home.createRoomAction")}
            </Button>
          </form>

          <div className={styles.roomDivider}>{t("home.orJoinRoom")}</div>

          <form className={styles.form} onSubmit={controller.handleJoinRoomSubmit}>
            <div className={styles.sectionHeader}>
              <h2>{t("home.openLobby")}</h2>
              <p>{t("home.existingRoomsHint")}</p>
            </div>

            <label className={styles.field}>
              <span className={styles.labelRow}>{t("home.roomCodeLabel")}</span>
              <TextInput
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                inputMode="text"
                onChange={(event) => controller.setJoinRoomId(event.target.value)}
                placeholder={t("home.roomCodePlaceholder")}
                value={controller.joinRoomId}
              />
            </label>

            <Button
              fullWidth
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              type="submit"
              variant="secondary"
            >
              {t("home.openLobby")}
            </Button>
          </form>
        </section>

        <section className={styles.roomListSection}>
          <div className={styles.roomListHeader}>
            <div className={styles.sectionHeader}>
              <h2>{t("home.availableRoomsTitle")}</h2>
              <p>{t("play.availableRoomsDescription")}</p>
            </div>
            <Button
              className={styles.refreshRoomsButton}
              fullWidth
              onClick={controller.refreshRooms}
              type="button"
              variant="secondary"
            >
              {t("home.refreshRooms")}
            </Button>
          </div>

          <div className={styles.roomList}>
            {controller.rooms.length > 0 ? (
              controller.rooms.map((room) => (
                <button
                  className={styles.roomListItem}
                  key={room.roomId}
                  onClick={() => controller.handleSelectRoom(room.roomId)}
                  type="button"
                >
                  <span className={styles.roomListCopy}>
                    <strong>{room.roomId}</strong>
                    <small>{t("home.roomHost", { hostName: room.hostName })}</small>
                  </span>
                  <span className={styles.roomListMeta}>
                    {t("home.roomPlayerCount", { count: room.playerCount })}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState
                className={styles.emptyState}
                description={t("home.noRoomsAvailable")}
                title={t("home.availableRoomsTitle")}
              />
            )}
          </div>
        </section>
      </main>
    </AppPageShell>
  );
}
