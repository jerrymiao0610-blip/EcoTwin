import type { ContextSnapshot, Location } from "@/lib/context/types";

interface WeatherContextControlProps {
  context: Readonly<ContextSnapshot> | null;
  isLoading: boolean;
  manualTemperature: number;
  manualRelativeHumidityPercent: number | null;
  referenceLocation: Readonly<Location>;
  onRefresh: () => void;
  onManualRelativeHumidityChange: (value: number | null) => void;
}

export function WeatherContextControl({
  context,
  isLoading,
  manualTemperature,
  manualRelativeHumidityPercent,
  referenceLocation,
  onRefresh,
  onManualRelativeHumidityChange,
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
          <dt>Relative humidity</dt>
          <dd>
            {context?.relativeHumidityPercent !== undefined
              ? `${context.relativeHumidityPercent} % RH`
              : <label className="weather-manual-rh">
                  <span className="sr-only">Manual outdoor relative humidity</span>
                  <input
                    aria-label="Manual outdoor relative humidity"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="Required"
                    value={manualRelativeHumidityPercent ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      onManualRelativeHumidityChange(
                        Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null,
                      );
                    }}
                  /> % RH
                </label>}
          </dd>
        </div>
        <div>
          <dt>Surface pressure</dt>
          <dd>{context?.pressureKPa !== undefined ? `${context.pressureKPa} kPa` : "101.325 kPa fallback only in sensor mode"}</dd>
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
      <p>Weather is context input only; it does not create an optimizer conclusion. Manual RH is used only by sensor-informed mode.</p>
      {context?.warnings.map((warning) => (
        <p className="weather-warning" role="status" key={warning}>{warning}</p>
      ))}
    </div>
  );
}
