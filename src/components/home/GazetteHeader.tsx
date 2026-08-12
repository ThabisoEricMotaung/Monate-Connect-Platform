import { getTranslations } from "next-intl/server"

export default async function GazetteHeader() {
  const t = await getTranslations("home")
  return (
    <div>
      <div style={{ background: '#1a3a2a', textAlign: 'center', padding: '5px 16px' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9FE1CB' }}>
          {t("kicker")}
        </span>
      </div>
    </div>
  )
}
