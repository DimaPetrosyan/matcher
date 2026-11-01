type Props = { title: string; text: string; steps?: readonly string[] }

export const Block = ({ title, text, steps }: Props) => (
  <div className="block">
    <div className="title">{title}</div>
    <div className="sub">{text}</div>
    {steps ? (
      <div className="steps">
        {steps.map((step, index) => (
          <div className="s" key={step}>
            <span className="n">{index + 1}</span>
            <span style={{ textWrap: "pretty" }}>{step}</span>
          </div>
        ))}
      </div>
    ) : null}
  </div>
)
