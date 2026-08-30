const payloadPattern = /^[A-Za-z0-9_-]{1,64}$/
const chatPattern = /^c-(\d{1,19})$/

export type StartSource =
  { kind: "direct" } | { kind: "chat"; tgChatId: number } | { kind: "unknown"; raw: string }

export const parseStartPayload = (raw: string | undefined | null): StartSource => {
  const value = raw?.trim()
  if (!value) return { kind: "direct" }
  if (!payloadPattern.test(value)) return { kind: "unknown", raw: value.slice(0, 64) }

  const match = chatPattern.exec(value)
  return match ? { kind: "chat", tgChatId: -Number(match[1]) } : { kind: "unknown", raw: value }
}

export const buildDeepLink = (botUsername: string, tgChatId: number) =>
  `https://t.me/${botUsername}?start=c-${Math.abs(tgChatId)}`
