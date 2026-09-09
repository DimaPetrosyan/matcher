const missing: string[] = []

const required = (name: string): string => {
  const value = Bun.env[name]?.trim()
  if (!value) missing.push(name)
  return value ?? ""
}

const optional = (name: string): string | undefined => Bun.env[name]?.trim() || undefined

export const env = {
  botToken: required("BOT_TOKEN"),
  databaseUrl: required("DATABASE_URL"),
  consentVersion: required("CONSENT_VERSION"),
  policyUrl: required("POLICY_URL"),
  botUsername: required("BOT_USERNAME"),
  port: Number(optional("PORT") ?? 3000),
  webAppUrl: optional("WEB_APP_URL"),
  webRoot: optional("WEB_ROOT") ?? "web/dist",
}

if (missing.length > 0) {
  throw new Error(`Missing env variables: ${missing.join(", ")}`)
}
