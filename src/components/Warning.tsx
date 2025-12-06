import { useI18n } from "../i18n/I18nProvider";
export default function Warning() {
  const { t } = useI18n();
  return (
    <div style={{ color: "red", fontWeight: "bold" }}>
      ⚠️ {t("warning_few_players")}
    </div>
  );
}