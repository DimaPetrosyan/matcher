type Props = { label?: string; title: string; subtitle: string }

export const StepHead = ({ label, title, subtitle }: Props) => (
  <>
    {label ? <div className="step-label">{label}</div> : null}
    <h1 className="title">{title}</h1>
    <p className="subtitle">{subtitle}</p>
  </>
)
