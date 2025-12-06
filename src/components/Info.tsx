import { useI18n } from "../i18n/I18nProvider";
export default function Info() {
  const { t } = useI18n();
  return (
    <div style={{ color: "green", fontWeight: "bold" }}> 
      ✅ {t("info_enough_players")}
    </div>
  );
}