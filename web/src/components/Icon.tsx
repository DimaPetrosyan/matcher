type Props = { name: string; size?: number; fill?: boolean; className?: string }

export const Icon = ({ name, size = 24, fill = false, className }: Props) => (
  <span
    aria-hidden="true"
    className={`icon ${fill ? "fill" : ""} ${className ?? ""}`}
    style={{ fontSize: size }}
  >
    {name}
  </span>
)
