import { useI18n } from "../../../features/i18n";
import styles from "../HomePage.module.css";

export function HomePageHero() {
  const { t } = useI18n();

  return (
    <section className={styles.heroSection}>
      <div className={styles.eyebrow}>{t("home.heroEyebrow")}</div>
      <h1 className={styles.title}>{t("home.heroTitle")}</h1>
      <p className={styles.subtitle}>{t("home.heroSubtitle")}</p>
      <p className={styles.heroSupport}>{t("home.heroSupport")}</p>
    </section>
  );
}
