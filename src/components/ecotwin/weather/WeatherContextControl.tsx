import type { ContextSnapshot, Location } from "@/lib/context/types";

interface WeatherContextControlProps {
  context: Readonly<ContextSnapshot> | null;
  isLoading: boolean;
  manualTemperature: number;
  referenceLocation: Readonly<Location>;
  onRefresh: () => void;
}

export function WeatherContextControl({
  context,
  isLoading,
  manualTemperature,
  referenceLocation,
  onRefresh,
}: WeatherContextControlProps) {
  const location = context?.location ?? referenceLocation;
  const sourceLabel = context?.source === "open-meteo"
    ? "Open-Meteo current weather"
    : "Manual temperature";

  return (
    <div className="weather-context">
      <div className="weather-context-heading">
        <div>
          <span>Weather context</span>
          <strong>{sourceLabel}</strong>
        </div>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading
            ? "Refreshing weather…"
            : context
              ? "Refresh weather"
              : "Use reference weather"}
        </button>
      </div>
      <dl>
        <div>
          <dt>Temperature</dt>
          <dd>{context?.temperature ?? manualTemperature} °C</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{location.name}</dd>
        </div>
        <div>
          <dt>Coordinates</dt>
          <dd>{location.latitude}, {location.longitude}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>
            {context
              ? <time dateTime={context.timestamp}>{context.timestamp}</time>
              : "Not refreshed"}
          </dd>
        </div>
      </dl>
      <p>Weather is context input only; it does not create an optimizer conclusion.</p>
      {context?.warnings.map((warning) => (
        <p className="weather-warning" role="status" key={warning}>{warning}</p>
      ))}
    </div>
  );
}
