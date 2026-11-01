import { Icon } from "./Icon"

type Props = { text: string; action?: string; onAction?: () => void }

export const Toast = ({ text, action, onAction }: Props) => (
  <div className="toast" role="alert">
    <span className="glyph">
      <Icon name="info" size={20} />
    </span>
    <span className="grow">{text}</span>
    {action ? (
      <button type="button" onClick={onAction}>
        {action}
      </button>
    ) : null}
  </div>
)
