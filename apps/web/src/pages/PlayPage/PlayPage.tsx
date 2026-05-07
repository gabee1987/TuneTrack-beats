import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { useI18n } from "../../features/i18n";
import { usePlayPageController } from "./hooks/usePlayPageController";
import styles from "./PlayPage.module.css";

export function PlayPage() {
  const { t } = useI18n();
  const controller = usePlayPageController();

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <div className={styles.backgroundOrbs} aria-hidden="true" />

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
              <input
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className={styles.textInput}
                inputMode="text"
                onChange={(event) => controller.setCreateRoomId(event.target.value)}
                placeholder={t("home.roomCodePlaceholder")}
                value={controller.createRoomId}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>{t("home.playerNameLabel")}</span>
              <input
                autoComplete="nickname"
                className={styles.textInput}
                maxLength={24}
                onChange={(event) => controller.setDisplayName(event.target.value)}
                placeholder={t("home.playerNamePlaceholder")}
                value={controller.displayName}
              />
            </label>

            <button
              className={styles.primaryAction}
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              type="submit"
            >
              <span className={styles.primaryActionInner}>
                <span className={styles.primaryActionLabel}>{t("home.createRoomAction")}</span>
              </span>
            </button>
          </form>

          <div className={styles.roomDivider}>{t("home.orJoinRoom")}</div>

          <form className={styles.form} onSubmit={controller.handleJoinRoomSubmit}>
            <div className={styles.sectionHeader}>
              <h2>{t("home.openLobby")}</h2>
              <p>{t("home.existingRoomsHint")}</p>
            </div>

            <label className={styles.field}>
              <span className={styles.labelRow}>{t("home.roomCodeLabel")}</span>
              <input
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className={styles.textInput}
                inputMode="text"
                onChange={(event) => controller.setJoinRoomId(event.target.value)}
                placeholder={t("home.roomCodePlaceholder")}
                value={controller.joinRoomId}
              />
            </label>

            <button
              className={styles.secondaryAction}
              onFocus={controller.preloadLobby}
              onMouseEnter={controller.preloadLobby}
              onTouchStart={controller.preloadLobby}
              type="submit"
            >
              {t("home.openLobby")}
            </button>
          </form>
        </section>

        <section className={styles.roomListSection}>
          <div className={styles.roomListHeader}>
            <div className={styles.sectionHeader}>
              <h2>{t("home.availableRoomsTitle")}</h2>
              <p>{t("play.availableRoomsDescription")}</p>
            </div>
            <button className={styles.refreshButton} onClick={controller.refreshRooms} type="button">
              {t("home.refreshRooms")}
            </button>
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
                  <span>
                    <strong>{room.roomId}</strong>
                    <small>{t("home.roomHost", { hostName: room.hostName })}</small>
                  </span>
                  <span>{t("home.roomPlayerCount", { count: room.playerCount })}</span>
                </button>
              ))
            ) : (
              <p className={styles.emptyRooms}>{t("home.noRoomsAvailable")}</p>
            )}
          </div>
        </section>
      </main>
    </AppPageShell>
  );
}
