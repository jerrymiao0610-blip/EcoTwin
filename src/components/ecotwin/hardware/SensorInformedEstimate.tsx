import type { SensorInformedSimulationResult } from "@/lib/sensor-simulation";

interface SensorInformedEstimateProps {
  result: Readonly<SensorInformedSimulationResult> | null;
  active: boolean;
  stale: boolean;
  warning: string | null;
  operatingHoursPerDay: number;
  operatingDaysPerMonth: number;
  operatingDaysPerYear: number;
}

export function SensorInformedEstimate({
  result,
  active,
  stale,
  warning,
  operatingHoursPerDay,
  operatingDaysPerMonth,
  operatingDaysPerYear,
}: SensorInformedEstimateProps) {
  if (!result && !warning) return null;

  return (
    <section className={`sensor-estimate ${active ? "is-active" : "is-previous"}`} aria-labelledby="sensor-estimate-title">
      <header>
        <div>
          <span className="eyebrow">Sensor-informed modeled estimate</span>
          <h2 id="sensor-estimate-title">Current-condition scenario</h2>
        </div>
        <span className={`sensor-mode-status ${active ? "active" : "inactive"}`} role="status" aria-live="polite">
          <i aria-hidden="true" />
          SENSOR-INFORMED MODE · {active ? "ACTIVE" : "MANUAL FALLBACK"}
        </span>
      </header>

      {stale && active ? (
        <p className="sensor-estimate-alert" role="status">SENSOR DATA STALE · Last estimate retained; automatic recomputation is paused.</p>
      ) : null}
      {warning ? <p className="sensor-estimate-alert" role="alert">{warning}</p> : null}

      {result ? (
        <>
          <div className="sensor-environment-grid">
            <EnvironmentValue
              label="MEASURED INDOOR OBSERVATION · EDGE NODE"
              temperatureC={result.environment.indoorObservation.temperatureC}
              rh={result.environment.indoorObservation.relativeHumidityPercent}
            />
            <EnvironmentValue
              label={`OUTDOOR ENVIRONMENTAL CONTEXT · ${result.environment.outdoorObservation.source === "open-meteo" ? "OPEN-METEO" : "MANUAL"}`}
              temperatureC={result.environment.outdoorObservation.temperatureC}
              rh={result.environment.outdoorObservation.relativeHumidityPercent}
              detail={`${result.environment.outdoorObservation.pressureKPa.toFixed(3)} kPa`}
            />
            <EnvironmentValue
              label="TARGET"
              temperatureC={result.environment.targets.temperatureC}
              rh={result.environment.targets.relativeHumidityPercent}
            />
            <div className="sensor-primary-estimate">
              <span>SENSOR-INFORMED MODELED ESTIMATE</span>
              <strong>{result.dailyEnergyKWh.toFixed(2)} <small>kWh/day</small></strong>
              <em>Current-condition scenario · not a utility-meter reading</em>
            </div>
          </div>

          <p className="sensor-estimate-description">
            Current-condition {operatingHoursPerDay}-hour scenario using the measured indoor observation and current outdoor environmental context.
          </p>

          <div className="sensor-hvac-breakdown" aria-label="Sensor-informed HVAC electricity breakdown">
            <dl>
              <div><dt>Sensible cooling</dt><dd>{result.hvac.sensibleCoolingElectricityKWh.toFixed(2)} kWh</dd></div>
              <div><dt>Sensible heating</dt><dd>{result.hvac.sensibleHeatingElectricityKWh.toFixed(2)} kWh</dd></div>
              <div><dt>Latent / dehumidification</dt><dd>{result.latentHvacElectricityKWh.toFixed(2)} kWh</dd></div>
              <div><dt>Total HVAC electricity</dt><dd>{result.totalHvacElectricityKWh.toFixed(2)} kWh</dd></div>
              <div><dt>Modeled moisture removal</dt><dd>{result.hvac.moistureRemovedKg.toFixed(2)} kg</dd></div>
              <div><dt>Moisture deficit</dt><dd>{result.hvac.moistureDeficitKg.toFixed(2)} kg</dd></div>
            </dl>
            <span className="sensor-detailed-mode">MODE · {result.hvac.detailedMode.replaceAll("-", " ").toUpperCase()}</span>
          </div>

          <section className="sensor-extrapolation" aria-labelledby="sensor-extrapolation-title">
            <header>
              <div>
                <span>ILLUSTRATIVE EXTRAPOLATION</span>
                <h3 id="sensor-extrapolation-title">Same-condition operating-day totals</h3>
              </div>
              <p>
                Assumes the same outdoor conditions and starting indoor state recur on every modeled operating day.
              </p>
            </header>
            <div className="sensor-extrapolation-grid">
              <ExtrapolationValue
                label={`Same-condition extrapolation · ${operatingDaysPerMonth} operating days`}
                energyKWh={result.monthlyEnergyKWh}
                co2Kg={result.monthlyCO2Kg}
                cost={result.monthlyCost}
              />
              <ExtrapolationValue
                label={`Same-condition extrapolation · ${operatingDaysPerYear} operating days`}
                energyKWh={result.annualEnergyKWh}
                co2Kg={result.annualCO2Kg}
                cost={result.annualCost}
              />
            </div>
            <p className="sensor-extrapolation-warning">
              These values are scenario extrapolations, not weather-normalized forecasts.
            </p>
          </section>

          <details className="sensor-transparency">
            <summary>Model transparency</summary>
            <ul>
              <li>Indoor temperature and humidity are a measured indoor observation from the Arduino Edge Node.</li>
              <li>Outdoor environmental context comes from Open-Meteo or explicit manual input.</li>
              <li>Humidity contributes through an educational latent-load model.</li>
              <li>Results are modeled estimates, not utility-meter measurements.</li>
              <li>DHT11 placement and calibration are not independently verified.</li>
              <li>Monthly and annual extrapolations assume the same starting indoor state recurs on every operating day.</li>
            </ul>
            <div className="sensor-transparency-note">
              <strong>Initial indoor state recovery</strong>
              <p>
                This term represents the modeled energy required to move the currently measured indoor temperature toward the thermostat target once during the daily scenario.
              </p>
            </div>
            <div className="sensor-transparency-note">
              <strong>Humidity interpretation</strong>
              <p>
                Under humid outdoor conditions, ventilation can dominate dehumidification load even when indoor relative humidity is currently near target.
              </p>
            </div>
            <div className="sensor-transparency-note">
              <strong>Educational ventilation modeling assumptions</strong>
              <p>These are not measured airflow values or code-compliance claims.</p>
              <ul>
                <li>{result.assumptions.hvac.ventilationLPerSecondPerPerson} L/s-person</li>
                <li>{result.assumptions.hvac.ventilationLPerSecondPerM2} L/s-m²</li>
                <li>{result.assumptions.hvac.infiltrationAirChangesPerHour} ACH infiltration</li>
                <li>Continuous over the modeled operating period</li>
              </ul>
            </div>
            {result.warnings.map((item) => <p key={item}>{item}</p>)}
          </details>
        </>
      ) : null}
    </section>
  );
}

function ExtrapolationValue({
  label,
  energyKWh,
  co2Kg,
  cost,
}: {
  label: string;
  energyKWh: number;
  co2Kg: number;
  cost: number;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{energyKWh.toFixed(2)} <small>kWh</small></strong>
      <dl>
        <div><dt>Derived CO₂</dt><dd>{co2Kg.toFixed(2)} kg</dd></div>
        <div><dt>Derived cost</dt><dd>${cost.toFixed(2)}</dd></div>
      </dl>
    </article>
  );
}

function EnvironmentValue({
  label,
  temperatureC,
  rh,
  detail,
}: {
  label: string;
  temperatureC: number;
  rh: number;
  detail?: string;
}) {
  return (
    <div className="sensor-environment-value">
      <span>{label}</span>
      <strong>{temperatureC.toFixed(1)}°C</strong>
      <b>{rh.toFixed(0)}% RH</b>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
