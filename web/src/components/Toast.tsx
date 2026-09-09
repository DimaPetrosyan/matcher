type Props = { title: string; text: string; action: string; onAction: () => void }

export const Toast = ({ title, text, action, onAction }: Props) => (
  <div className="toast" role="alert">
    <div className="glyph">!</div>
    <div className="grow">
      <div className="t">{title}</div>
      <div className="d">{text}</div>
    </div>
    <button type="button" onClick={onAction}>
      {action}
    </button>
  </div>
)
