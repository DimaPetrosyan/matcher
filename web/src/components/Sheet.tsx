import { useEffect, useRef, useState, type ReactNode } from "react"

type Props = { onClose: () => void; children: (close: (then?: () => void) => void) => ReactNode }

// Уход шторки надо дорисовать, поэтому закрытие живёт здесь: кнопки внутри
// получают close(действие) и не знают про задержку.
export const Sheet = ({ onClose, children }: Props) => {
  const [closing, setClosing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  const close = (then?: () => void) => {
    if (closing) return
    setClosing(true)
    timer.current = setTimeout(() => {
      then?.()
      onClose()
    }, 260)
  }

  return (
    <div className={`scrim ${closing ? "out" : ""}`} onClick={() => close()}>
      <div className="sheet" onClick={event => event.stopPropagation()}>
        <div className="grab">
          <i />
        </div>
        {children(close)}
      </div>
    </div>
  )
}
