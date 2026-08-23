import type { CSSProperties } from "react";
import type { ClassroomConfig, SimulationResult } from "@/lib/simulation";

type HighlightedSystem = "HVAC" | "Devices" | "Lighting";
type TwinFeedbackKey = keyof ClassroomConfig | "period" | "reset" | null;

type TwinProperties = CSSProperties & {
  "--airflow-strength": number;
  "--device-strength": number;
  "--lighting-level": number;
  "--outdoor-heat": number;
};

type Props = {
  config: ClassroomConfig;
  result: SimulationResult;
  highlightedItems?: HighlightedSystem[];
  feedbackKey?: TwinFeedbackKey;
  feedbackToken?: number;
};

const formatEnergy = (value: number) => value.toFixed(1);

export function ClassroomTwin({ config, result, highlightedItems = [], feedbackKey = null, feedbackToken = 0 }: Props) {
  const occupants = config.occupants > 0 ? Math.min(12, Math.max(1, Math.round(config.occupants / 3))) : 0;
  const lightingLevel = config.lightsEnabled ? Math.min(1, Math.max(0, config.lightingLevelPercent / 100)) : 0;
  const hvacDrawingLoad = result.hvacMode === "heating" || result.hvacMode === "cooling";
  const devicesDrawingLoad = config.devicesEnabled && result.deviceEnergyKWh > 0.005;
  const lightingDrawingLoad = config.lightsEnabled && result.lightingEnergyKWh > 0.005;
  const airflowStrength = hvacDrawingLoad ? Math.min(1, Math.max(0.18, result.hvacEnergyKWh / 32)) : 0;
  const deviceStrength = devicesDrawingLoad ? Math.min(1, Math.max(0, config.devicePowerW / 6000)) : 0;
  const deviceBars = devicesDrawingLoad ? Math.max(1, Math.ceil(deviceStrength * 3)) : 0;
  const outdoorHeat = Math.min(1, Math.max(0, (config.outsideTemperatureC + 10) / 55));
  const sceneStyle: TwinProperties = {
    "--airflow-strength": airflowStrength,
    "--device-strength": deviceStrength,
    "--lighting-level": lightingLevel,
    "--outdoor-heat": outdoorHeat,
  };
  const lightingState = !config.lightsEnabled ? "lights-off" : lightingLevel === 0 ? "lighting-zero" : lightingDrawingLoad ? "lights-on" : "lights-standby";
  const hvacFeedback = highlightedItems.includes("HVAC");
  const lightingFeedback = highlightedItems.includes("Lighting");
  const devicesFeedback = highlightedItems.includes("Devices");
  const occupancyFeedback = feedbackKey === "occupants" || feedbackKey === "reset";
  const roomFeedback = feedbackKey === "roomAreaM2" || occupancyFeedback;
  const temperatureFeedback = feedbackKey === "outsideTemperatureC" || feedbackKey === "thermostatTemperatureC" || feedbackKey === "reset";
  const hvacState = result.hvacMode;
  const devicesState = !config.devicesEnabled ? "off" : devicesDrawingLoad ? "drawing load" : "standby";
  const devicesStatusLabel = !config.devicesEnabled ? "off" : devicesDrawingLoad ? "load" : "standby";
  const lightingStateLabel = !config.lightsEnabled ? "off" : lightingDrawingLoad ? `${config.lightingLevelPercent}% active` : `${config.lightingLevelPercent}% standby`;

  return (
    <section className="twin-panel" aria-labelledby="twin-title">
      <div className="panel-heading twin-heading">
        <div><span className="eyebrow">02 · Digital twin</span><h2 id="twin-title">Classroom digital twin</h2></div>
        <div className="twin-live-output" aria-label={`${formatEnergy(result.dailyEnergyKWh)} kilowatt-hours modeled energy per day`}>
          <span>Current modeled load</span><strong>{formatEnergy(result.dailyEnergyKWh)} <small>kWh/day</small></strong>
        </div>
      </div>

      <div className={`room-scene ${lightingState}`} style={sceneStyle} role="img" aria-label={`Classroom twin. Outdoor temperature ${config.outsideTemperatureC} degrees Celsius. Room target ${config.thermostatTemperatureC} degrees Celsius. ${config.occupants} people. HVAC ${hvacState}. Lighting ${lightingStateLabel}. Devices ${devicesState}. Modeled energy ${formatEnergy(result.dailyEnergyKWh)} kilowatt-hours per day.`}>
        <div className="room-wall" aria-hidden="true" />
        <div className="room-ceiling" aria-hidden="true" />
        <div className="room-floor" aria-hidden="true"><i /><i /><i /></div>

        <div className={`outside-condition${temperatureFeedback ? " twin-state-feedback" : ""}`} key={`outside-${temperatureFeedback ? feedbackToken : 0}`}>
          <span>Outdoor input</span>
          <strong>{config.outsideTemperatureC}<small>°C</small></strong>
          <em>Climate condition</em>
          <div className="temperature-scale" aria-hidden="true"><i /><b /></div>
        </div>

        <div className={`room-label${roomFeedback ? " twin-state-feedback" : ""}`} key={`room-${roomFeedback ? feedbackToken : 0}`}>
          <strong>INTERACTIVE CLASSROOM</strong><span>{config.roomAreaM2} m²</span><span className="room-occupancy">{config.occupants} people</span>
        </div>

        <div className="thermal-guide" aria-hidden="true"><span>OUTSIDE</span><i /><b>ROOM TARGET</b></div>
        <div className="window" aria-hidden="true"><span /><i /><i /></div>

        <div className={`ceiling-lights${lightingFeedback ? " twin-state-feedback" : ""}`} key={`lighting-${lightingFeedback ? feedbackToken : 0}`}>
          <span className="lighting-state-label">Lighting <b>{lightingStateLabel}</b></span>
          {[0, 1, 2].map((light) => <i className="ceiling-light" aria-hidden="true" key={light}><b /></i>)}
        </div>

        <div className={`hvac-assembly${hvacFeedback ? " twin-state-feedback" : ""}`} key={`hvac-${hvacFeedback ? feedbackToken : 0}`}>
          <div className={`hvac-unit ${hvacState}${hvacDrawingLoad ? " active" : hvacState === "off" ? " inactive" : ""}`}><span>≋</span><small>HVAC</small><b>{hvacState.toUpperCase()}</b></div>
          <svg className={`airflow-paths ${hvacState} ${hvacDrawingLoad ? "active" : "inactive"}`} aria-hidden="true" viewBox="0 0 380 100" preserveAspectRatio="none">
            <path d="M374 14 C318 15 326 58 255 55 S153 22 84 53 S28 76 5 67" />
            <path d="M374 31 C330 38 318 79 248 73 S151 44 93 70 S33 91 8 84" />
            <path d="M374 48 C337 54 314 93 258 91 S175 65 121 86" />
          </svg>
        </div>

        <div className={`thermostat${temperatureFeedback ? " twin-state-feedback" : ""}`} key={`target-${temperatureFeedback ? feedbackToken : 0}`}><span>ROOM TARGET</span><b>{config.thermostatTemperatureC}°C</b></div>

        <div className={`desks${occupancyFeedback ? " twin-state-feedback" : ""}`} aria-hidden="true" key={`occupancy-${occupancyFeedback ? feedbackToken : 0}`}>
          {Array.from({ length: 12 }, (_, index) => (
            <div className={`desk ${index < occupants ? "occupied" : ""}`} key={index}>
              <span className={`desk-monitor ${!config.devicesEnabled ? "inactive" : devicesDrawingLoad ? "active" : "idle"}`} />
              <span className="person"><i /><b /></span>
            </div>
          ))}
        </div>

        <div className={`device-bank ${!config.devicesEnabled ? "inactive" : devicesDrawingLoad ? "active" : "idle"}${devicesFeedback ? " twin-state-feedback" : ""}`} key={`devices-${devicesFeedback ? feedbackToken : 0}`}>
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M9 20h6M12 16v4" /></svg></span>
          <small>DEVICES {devicesStatusLabel.toUpperCase()}</small>
          <strong>{(config.devicePowerW / 1000).toFixed(1)} kW</strong>
          <div className="device-level" aria-hidden="true">{[1, 2, 3].map((bar) => <i className={bar <= deviceBars ? "active" : ""} key={bar} />)}</div>
        </div>

        <div className="energy-trace" aria-label="Daily modeled energy by classroom system">
          <span className="trace-kicker">Daily load</span>
          <div className={`trace-system trace-hvac${hvacFeedback ? " twin-state-feedback" : ""}`} key={`trace-hvac-${hvacFeedback ? feedbackToken : 0}`}><i /><span>HVAC</span><strong>{formatEnergy(result.hvacEnergyKWh)} <small>kWh</small></strong></div>
          <div className={`trace-system trace-devices${devicesFeedback ? " twin-state-feedback" : ""}`} key={`trace-devices-${devicesFeedback ? feedbackToken : 0}`}><i /><span>Devices</span><strong>{formatEnergy(result.deviceEnergyKWh)} <small>kWh</small></strong></div>
          <div className={`trace-system trace-lighting${lightingFeedback ? " twin-state-feedback" : ""}`} key={`trace-lighting-${lightingFeedback ? feedbackToken : 0}`}><i /><span>Lighting</span><strong>{formatEnergy(result.lightingEnergyKWh)} <small>kWh</small></strong></div>
          <div className="trace-total"><span>MODELED ENERGY</span><strong>{formatEnergy(result.dailyEnergyKWh)} <small>kWh/day</small></strong></div>
        </div>
      </div>
    </section>
  );
}
