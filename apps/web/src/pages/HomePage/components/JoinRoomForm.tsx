import type { PublicRoomSummary } from "@tunetrack/shared";
import type { FormEvent } from "react";
import { useI18n } from "../../../features/i18n";
import { ActionButton } from "../../../features/ui/ActionButton";
import { RoomPrimaryActionButton } from "../../../features/ui/RoomPrimaryActionButton";
import { TextInput } from "../../../features/ui/TextInput";
import styles from "../HomePage.module.css";

interface JoinRoomFormProps {
  createRoomId: string;
  displayName: string;
  joinRoomId: string;
  rooms: PublicRoomSummary[];
  onIntentToSubmit: () => void;
  onCreateRoomIdChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onJoinRoomIdChange: (value: string) => void;
  onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onJoinSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshRooms: () => void;
  onSelectRoom: (roomId: string) => void;
}

export function JoinRoomForm({
  createRoomId,
  displayName,
  joinRoomId,
  onIntentToSubmit,
  onCreateRoomIdChange,
  onDisplayNameChange,
  onJoinRoomIdChange,
  onCreateSubmit,
  onJoinSubmit,
  onRefreshRooms,
  onSelectRoom,
  rooms,
}: JoinRoomFormProps) {
  const { t } = useI18n();

  return (
    <section className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <div>
          <h2 className={styles.formTitle}>{t("home.roomEntryTitle")}</h2>
          <p className={styles.formDescription}>{t("home.roomEntryDescription")}</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={onCreateSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("home.createRoomCodeLabel")}</span>
          <TextInput
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.textInput}
            inputMode="text"
            onChange={(event) => onCreateRoomIdChange(event.target.value)}
            placeholder={t("home.roomCodePlaceholder")}
            type="text"
            value={createRoomId}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("home.playerNameLabel")}</span>
          <TextInput
            className={styles.textInput}
            maxLength={24}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder={t("home.playerNamePlaceholder")}
            type="text"
            value={displayName}
          />
        </label>

        <RoomPrimaryActionButton
          fullWidth
          className={styles.primaryButton}
          onFocus={onIntentToSubmit}
          onMouseEnter={onIntentToSubmit}
          onTouchStart={onIntentToSubmit}
          type="submit"
        >
          {t("home.createRoomAction")}
        </RoomPrimaryActionButton>
      </form>

      <div className={styles.roomDivider}>{t("home.orJoinRoom")}</div>

      <form className={styles.form} onSubmit={onJoinSubmit}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("home.roomCodeLabel")}</span>
          <TextInput
            autoCapitalize="none"
            autoCorrect="off"
            className={styles.textInput}
            inputMode="text"
            onChange={(event) => onJoinRoomIdChange(event.target.value)}
            placeholder={t("home.roomCodePlaceholder")}
            type="text"
            value={joinRoomId}
          />
        </label>

        <div className={styles.formFooter}>
          <p className={styles.formHint}>{t("home.existingRoomsHint")}</p>
          <ActionButton
            className={styles.primaryButton}
            onFocus={onIntentToSubmit}
            onMouseEnter={onIntentToSubmit}
            onTouchStart={onIntentToSubmit}
            type="submit"
            variant="neutral"
          >
            {t("home.openLobby")}
          </ActionButton>
        </div>
      </form>

      <div className={styles.roomListHeader}>
        <span className={styles.fieldLabel}>{t("home.availableRoomsTitle")}</span>
        <button className={styles.inlineButton} onClick={onRefreshRooms} type="button">
          {t("home.refreshRooms")}
        </button>
      </div>

      <div className={styles.roomList}>
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <button
              className={styles.roomListItem}
              key={room.roomId}
              onClick={() => onSelectRoom(room.roomId)}
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
          <p className={styles.formHint}>{t("home.noRoomsAvailable")}</p>
        )}
      </div>
    </section>
  );
}
