const stages = [
  "REAL WORLD",
  "DIGITAL TWIN",
  "SIMULATE",
  "OPTIMIZE",
  "RECOMMEND",
  "IMPACT",
] as const;

export function TwinJourneyRail() {
  return (
    <nav className="twin-journey" aria-label="EcoTwin decision journey">
      <span className="journey-kicker">Decision twin workflow</span>
      <ol>
        {stages.map((stage, index) => (
          <li key={stage}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage}</strong>
          </li>
        ))}
      </ol>
    </nav>
  );
}
