type Props = { title: string; text: string }

export const AccessState = ({ title, text }: Props) => (
  <div className="state">
    <div className="glyph">!</div>
    <div className="t">{title}</div>
    <div className="d">{text}</div>
  </div>
)

export const LoadingState = () => (
  <>
    <div className="skeleton" style={{ width: 32, height: 11, margin: "2px 0 11px" }} />
    <div className="skeleton" style={{ width: 168, height: 19, borderRadius: 5, margin: "0 0 10px" }} />
    <div className="skeleton" style={{ width: 280, height: 13, margin: "0 0 6px" }} />
    <div className="skeleton" style={{ width: 204, height: 13, margin: "0 0 24px" }} />
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {[62, 96, 110, 104, 98, 96, 68, 78, 100, 82].map((width, index) => (
        <div
          key={index}
          className="skeleton"
          style={{ width, height: 36, borderRadius: 999 }}
        />
      ))}
    </div>
  </>
)
