import { useI18n } from "../../../features/i18n";
import { Avatar, ListRowButton, ListSkeleton } from "../../../features/ui/primitives";
import type { JoinPageController } from "../hooks/useJoinPageController";
import styles from "../JoinPage.module.css";

interface JoinOpenRoomsProps {
  controller: JoinPageController;
}

/** The live list of open rooms: a tap joins. The server pushes every change to it. */
export function JoinOpenRooms({ controller }: JoinOpenRoomsProps) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="join-open-rooms" className={styles.rooms}>
      <h2 className={styles.sectionTitle} id="join-open-rooms">
        {t("join.openRooms")}
      </h2>
      <OpenRoomsBody controller={controller} />
    </section>
  );
}

function OpenRoomsBody({ controller }: JoinOpenRoomsProps) {
  const { t } = useI18n();

  if (controller.connectionProblem) {
    return <p className={styles.note}>{controller.connectionProblem}</p>;
  }
  if (!controller.hasLoadedRooms) {
    return <ListSkeleton count={3} leading="avatar" trailing="action" />;
  }
  if (controller.rooms.length === 0) {
    return <p className={styles.note}>{t("join.noRooms")}</p>;
  }

  return (
    <ul className={styles.roomList}>
      {controller.rooms.map((room) => (
        <li className={styles.roomItem} key={room.roomId}>
          <ListRowButton
            leading={<Avatar initials={room.hostName} />}
            onClick={() => controller.handleSelectRoom(room.roomId)}
            onFocus={controller.preloadLobby}
            onTouchStart={controller.preloadLobby}
            subtitle={`${t("join.roomHost", { name: room.hostName })} · ${t("join.roomPlayers", {
              count: room.playerCount,
            })}`}
            title={<span className={styles.roomCode}>{room.roomId}</span>}
            trailing={<ChevronGlyph />}
          />
        </li>
      ))}
    </ul>
  );
}

function ChevronGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
