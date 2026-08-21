type MetricCardProps = {
  label: string;
  value: string;
  unit: string;
  detail: string;
  tone: "energy" | "carbon" | "cost" | "score";
};

const glyphs = {
  energy: "⚡",
  carbon: "◌",
  cost: "$",
  score: "✦",
};

export function MetricCard({ label, value, unit, detail, tone }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        <span aria-hidden="true" className="metric-glyph">{glyphs[tone]}</span>
      </div>
      <div className="metric-value-row">
        <strong>{value}</strong><span>{unit}</span>
      </div>
      <p>{detail}</p>
    </article>
  );
}
