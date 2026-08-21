type MetricCardProps = {
  label: string;
  value: string;
  unit: string;
  detail: string;
  tone: "energy" | "carbon" | "cost" | "score";
  classification?: string;
  feedback?: boolean;
};

function MetricIcon({ tone }: Pick<MetricCardProps, "tone">) {
  const commonProps = {
    "aria-hidden": true,
    className: "metric-icon",
    fill: "none",
    viewBox: "0 0 24 24",
  } as const;

  if (tone === "energy") {
    return <svg {...commonProps}><path d="m13.5 2-7 11h5l-1 9 7-12h-5l1-8Z" /></svg>;
  }

  if (tone === "carbon") {
    return <svg {...commonProps}><path d="M7.5 17.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5 1.2 3.5 3.5 0 0 0 1.1 6.8Z" /><path d="M9.2 13.8c1.6-2.1 3.5-2.8 5.7-2.2-1 2.3-2.7 3.4-5.2 3.1" /></svg>;
  }

  if (tone === "cost") {
    return <svg {...commonProps}><circle cx="12" cy="12" r="8" /><path d="M14.8 8.8c-.7-.5-1.6-.8-2.6-.8-1.5 0-2.6.7-2.6 1.8 0 2.8 5.2 1.3 5.2 4.1 0 1.2-1.1 2.1-2.8 2.1-1.1 0-2.2-.4-3-1.1M12 6.5v11" /></svg>;
  }

  return <svg {...commonProps}><path d="M5 16.5a8 8 0 1 1 14 0" /><path d="m12 13 3.5-3.5" /><path d="M7.5 18h9" /></svg>;
}

export function MetricCard({ label, value, unit, detail, tone, classification, feedback = false }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}${feedback ? " metric-feedback" : ""}`}>
      <div className="metric-card-top">
        <span className="metric-label">
          {classification && <small>{classification}</small>}
          {label}
        </span>
        <span aria-hidden="true" className="metric-glyph"><MetricIcon tone={tone} /></span>
      </div>
      <div className="metric-value-row">
        <strong>{value}</strong><span>{unit}</span>
      </div>
      <p>{detail}</p>
    </article>
  );
}
