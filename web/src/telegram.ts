import type { Scheme } from "./types"

type Handler = () => void

type BottomButton = {
  setParams(params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }): void
  show(): void
  hide(): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  onClick(handler: Handler): void
  offClick(handler: Handler): void
}

type WebApp = {
  initData: string
  colorScheme: Scheme
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor?(color: string): void
  onEvent(event: string, handler: Handler): void
  offEvent(event: string, handler: Handler): void
  BackButton: { show(): void; hide(): void; onClick(h: Handler): void; offClick(h: Handler): void }
  MainButton: BottomButton
  HapticFeedback?: {
    selectionChanged(): void
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void
    notificationOccurred(type: "error" | "success" | "warning"): void
  }
}

export const tg: WebApp | undefined = (
  window as unknown as { Telegram?: { WebApp?: WebApp } }
).Telegram?.WebApp

export const inTelegram = Boolean(tg?.initData)

export const palette = {
  light: { ground: "#FAF9F5", sunken: "#F0EEE6", muted: "#6E6B64", mbBg: "#B4552F", mbFg: "#FFFFFF" },
  dark: { ground: "#1B1A19", sunken: "#131211", muted: "#A19D94", mbBg: "#D97757", mbFg: "#1B1A19" },
} as const

export const applyScheme = (scheme: Scheme) => {
  document.documentElement.dataset.theme = scheme

  const colors = palette[scheme]

  tg?.setHeaderColor(colors.ground)
  tg?.setBackgroundColor(colors.ground)
  tg?.setBottomBarColor?.(colors.ground)
}

export const haptic = {
  select: () => tg?.HapticFeedback?.selectionChanged(),
  remove: () => tg?.HapticFeedback?.impactOccurred("light"),
  done: () => tg?.HapticFeedback?.notificationOccurred("success"),
  failed: () => tg?.HapticFeedback?.notificationOccurred("error"),
}

export const initData = (): string => {
  if (tg?.initData) return tg.initData
  if (import.meta.env.DEV) return import.meta.env.VITE_DEV_INIT_DATA ?? ""
  return ""
}
