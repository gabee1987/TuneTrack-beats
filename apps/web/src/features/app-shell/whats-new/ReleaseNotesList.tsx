import { useI18n } from "../../i18n";
import { releaseNoteSectionItemKeys, releaseNotes, type ReleaseNote } from "./releaseNotes";
import styles from "./ReleaseNotesList.module.css";

/** Every version, newest first, on a dated rail; the newest one leads, marked Latest. */
export function ReleaseNotesList() {
  return (
    <ol className={styles.list}>
      {releaseNotes.map((note, index) => (
        <li className={styles.entry} key={note.version}>
          <ReleaseNoteEntry isLatest={index === 0} note={note} />
        </li>
      ))}
    </ol>
  );
}

interface ReleaseNoteEntryProps {
  isLatest: boolean;
  note: ReleaseNote;
}

function ReleaseNoteEntry({ isLatest, note }: ReleaseNoteEntryProps) {
  const { languageId, t } = useI18n();
  const titleId = `release-${note.key}`;

  return (
    <article
      aria-labelledby={titleId}
      className={isLatest ? `${styles.release} ${styles.latest}` : styles.release}
    >
      <header className={styles.meta}>
        <span className={styles.version}>{t("whatsNew.version", { version: note.version })}</span>
        {isLatest ? <span className={styles.latestBadge}>{t("whatsNew.latest")}</span> : null}
        <time className={styles.date} dateTime={note.date}>
          {formatReleaseDate(note.date, languageId)}
        </time>
      </header>
      <h3 className={styles.title} id={titleId}>
        {t(`releaseNotes.${note.key}.title`)}
      </h3>
      <p className={styles.summary}>{t(`releaseNotes.${note.key}.summary`)}</p>

      {note.sections.map((section) => (
        <section className={styles.section} key={section.id}>
          <h4 className={styles.sectionTitle}>
            {t(`releaseNotes.${note.key}.${section.id}.title`)}
          </h4>
          <ul className={styles.items}>
            {releaseNoteSectionItemKeys(note, section).map((key) => (
              <li className={styles.item} key={key}>
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

function formatReleaseDate(date: string, languageId: string) {
  return new Intl.DateTimeFormat(languageId, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
