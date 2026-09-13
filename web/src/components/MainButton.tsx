import { useEffect, useRef } from "react"
import { inTelegram, palette, tg } from "../telegram"
import type { Scheme } from "../types"

export type ButtonKind = "active" | "disabled" | "secondary" | "loading"

type Props = {
  label: string
  kind: ButtonKind
  scheme: Scheme
  onClick: () => void
}

export const MainButton = ({ label, kind, scheme, onClick }: Props) => {
  const handler = useRef(onClick)
  handler.current = onClick

  useEffect(() => {
    if (!inTelegram || !tg) return

    const button = tg.MainButton
    const colors = palette[scheme]
    const call = () => handler.current()

    button.setParams({
      text: label,
      is_visible: true,
      is_active: kind !== "disabled" && kind !== "loading",
      color: kind === "disabled" ? colors.sunken : colors.mbBg,
      text_color: kind === "disabled" ? colors.muted : colors.mbFg,
    })

    if (kind === "loading") button.showProgress(false)
    else button.hideProgress()

    button.onClick(call)

    return () => button.offClick(call)
  }, [label, kind, scheme])

  if (inTelegram) return null

  return (
    <div className="bottom">
      <button
        type="button"
        className={`mb ${kind === "disabled" ? "disabled" : ""} ${kind === "secondary" ? "secondary" : ""}`}
        disabled={kind === "disabled" || kind === "loading"}
        onClick={onClick}
      >
        {kind === "loading" ? <span className="spinner" /> : null}
        <span>{label}</span>
      </button>
    </div>
  )
}
