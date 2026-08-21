export type Period = "daily" | "monthly" | "annual";

export function PeriodSelector({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="period-selector" aria-label="Impact period">
      {(["daily", "monthly", "annual"] as const).map((option) => (
        <button key={option} type="button" className={period === option ? "active" : ""} onClick={() => onChange(option)}>
          {option[0].toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
}
