export type Period = "daily" | "monthly" | "annual";

export function PeriodSelector({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="period-control">
      <span className="period-scope">Applies to energy, CO₂ &amp; cost</span>
      <div className="period-selector" role="group" aria-label="Energy, carbon, and cost period">
        {(["daily", "monthly", "annual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            className={period === option ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
