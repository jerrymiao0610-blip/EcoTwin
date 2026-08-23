import type { ClassroomConfig, SimulationResult } from "@/lib/simulation";

interface RealWorldSummaryProps {
  config: Readonly<ClassroomConfig>;
  result: Readonly<SimulationResult>;
}

const systemState = (enabled: boolean) => (enabled ? "Enabled" : "Off");

export function RealWorldSummary({ config, result }: RealWorldSummaryProps) {
  return (
    <section className="real-world-summary" aria-labelledby="real-world-title">
      <header>
        <span className="mission-index">01</span>
        <div>
          <span className="eyebrow">Real world</span>
          <h2 id="real-world-title">Current classroom state</h2>
        </div>
      </header>

      <div className="operating-state">
        <span>Operating state</span>
        <strong>{result.hvacMode === "off" ? "Systems at rest" : `${result.hvacMode} demand`}</strong>
        <small>{config.operatingHoursPerDay} h/day · {config.operatingDaysPerMonth} days/month</small>
      </div>

      <dl className="real-world-facts">
        <div><dt>Occupancy</dt><dd>{config.occupants} people</dd></div>
        <div><dt>Outdoor context</dt><dd>{config.outsideTemperatureC} °C</dd></div>
        <div><dt>Room target</dt><dd>{config.thermostatTemperatureC} °C</dd></div>
      </dl>

      <div className="system-state-list" aria-label="Enabled classroom systems">
        <span>Major systems</span>
        <ul>
          <li data-enabled={config.hvacEnabled}>HVAC <b>{systemState(config.hvacEnabled)}</b></li>
          <li data-enabled={config.lightsEnabled}>Lighting <b>{systemState(config.lightsEnabled)}</b></li>
          <li data-enabled={config.devicesEnabled}>Devices <b>{systemState(config.devicesEnabled)}</b></li>
        </ul>
      </div>
    </section>
  );
}
