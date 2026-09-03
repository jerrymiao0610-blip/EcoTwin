import type { CSSProperties, PointerEvent } from "react";
import type {
  EdgeNodeConnectionStatus,
  EdgeNodeFreshness,
  EdgeNodeTelemetry,
} from "@/lib/hardware/types";
import type { ClassroomConfig, SimulationResult } from "@/lib/simulation";
import { AnimatedNumber } from "./AnimatedNumber";

export type TwinSystemFocus = "HVAC" | "Devices" | "Lighting";
type TwinFeedbackKey = keyof ClassroomConfig | "period" | "reset" | "scenario" | null;

type TwinProperties = CSSProperties & {
  "--airflow-strength": number;
  "--device-strength": number;
  "--lighting-level": number;
  "--outdoor-heat": number;
  "--parallax-rx": string;
  "--parallax-ry": string;
};

type Props = {
  config: ClassroomConfig;
  result: Pick<
    SimulationResult,
    | "dailyEnergyKWh"
    | "hvacEnergyKWh"
    | "lightingEnergyKWh"
    | "deviceEnergyKWh"
    | "hvacMode"
  >;
  highlightedItems?: TwinSystemFocus[];
  causalFocus?: TwinSystemFocus | null;
  feedbackKey?: TwinFeedbackKey;
  feedbackToken?: number;
  scenarioTitle?: string | null;
  edgeNodeTelemetry?: EdgeNodeTelemetry | null;
  edgeNodeConnectionStatus?: EdgeNodeConnectionStatus;
  edgeNodeFreshness?: EdgeNodeFreshness | null;
};

const formatEnergy = (value: number) => value.toFixed(1);

export function twinHvacPresentationState(
  config: Pick<ClassroomConfig, "hvacEnabled" | "operatingHoursPerDay">,
  result: Pick<SimulationResult, "hvacMode">,
): { state: SimulationResult["hvacMode"]; drawingLoad: boolean } {
  if (!config.hvacEnabled) return { state: "off", drawingLoad: false };
  if (config.operatingHoursPerDay <= 0) {
    return { state: "idle", drawingLoad: false };
  }
  return {
    state: result.hvacMode,
    drawingLoad: result.hvacMode === "heating" || result.hvacMode === "cooling",
  };
}

export function ClassroomTwin({ config, result, highlightedItems = [], causalFocus = null, feedbackKey = null, feedbackToken = 0, scenarioTitle = null, edgeNodeTelemetry = null, edgeNodeConnectionStatus = "disconnected", edgeNodeFreshness = null }: Props) {
  const withinOperatingSchedule = config.operatingHoursPerDay > 0;
  const occupants = config.occupants > 0 ? Math.min(12, Math.max(1, Math.round(config.occupants / 3))) : 0;
  const lightingLevel = config.lightsEnabled ? Math.min(1, Math.max(0, config.lightingLevelPercent / 100)) : 0;
  const hvacPresentation = twinHvacPresentationState(config, result);
  const hvacDrawingLoad = hvacPresentation.drawingLoad;
  const devicesDrawingLoad = config.devicesEnabled && result.deviceEnergyKWh > 0.005;
  const lightingDrawingLoad = config.lightsEnabled && result.lightingEnergyKWh > 0.005;
  const airflowStrength = hvacDrawingLoad && result.dailyEnergyKWh > 0
    ? Math.min(1, Math.max(0.18, result.hvacEnergyKWh / result.dailyEnergyKWh))
    : 0;
  const deviceStrength = devicesDrawingLoad && result.dailyEnergyKWh > 0
    ? Math.min(1, Math.max(0.12, result.deviceEnergyKWh / result.dailyEnergyKWh))
    : 0;
  const deviceBars = devicesDrawingLoad ? Math.max(1, Math.ceil(deviceStrength * 3)) : 0;
  const outdoorHeat = Math.min(1, Math.max(0, (config.outsideTemperatureC + 10) / 55));
  const sceneStyle: TwinProperties = {
    "--airflow-strength": airflowStrength,
    "--device-strength": deviceStrength,
    "--lighting-level": lightingLevel,
    "--outdoor-heat": outdoorHeat,
    "--parallax-rx": "0deg",
    "--parallax-ry": "0deg",
  };
  const lightingState = !config.lightsEnabled ? "lights-off" : lightingLevel === 0 ? "lighting-zero" : lightingDrawingLoad ? "lights-on" : "lights-standby";
  const hvacFeedback = highlightedItems.includes("HVAC");
  const lightingFeedback = highlightedItems.includes("Lighting");
  const devicesFeedback = highlightedItems.includes("Devices");
  const occupancyFeedback = feedbackKey === "occupants" || feedbackKey === "reset" || feedbackKey === "scenario";
  const roomFeedback = feedbackKey === "roomAreaM2" || occupancyFeedback;
  const temperatureFeedback = feedbackKey === "outsideTemperatureC" || feedbackKey === "thermostatTemperatureC" || feedbackKey === "reset" || feedbackKey === "scenario";
  const hvacState = hvacPresentation.state;
  const devicesState = !config.devicesEnabled ? "off" : devicesDrawingLoad ? "drawing load" : "standby";
  const devicesStatusLabel = !config.devicesEnabled ? "off" : devicesDrawingLoad ? "load" : "standby";
  const lightingStateLabel = !config.lightsEnabled ? "off" : lightingDrawingLoad ? `${config.lightingLevelPercent}% active` : `${config.lightingLevelPercent}% standby`;
  const causalFocusClass = causalFocus ? ` causal-focus causal-focus-${causalFocus.toLowerCase()}` : "";
  const hvacCausalFocus = causalFocus === "HVAC";
  const lightingCausalFocus = causalFocus === "Lighting";
  const devicesCausalFocus = causalFocus === "Devices";
  const modeledStateLabel = scenarioTitle
    ? `What-if · ${scenarioTitle}`
    : withinOperatingSchedule
      ? "Current state"
      : "Schedule idle";
  const edgeNodeStatusLabel = edgeNodeConnectionStatus === "connected"
    ? edgeNodeFreshness === "live"
      ? "LIVE"
      : edgeNodeFreshness === "stale"
        ? "STALE"
        : "NO RECENT DATA"
    : "DISCONNECTED";

  const resetParallax = (scene: HTMLDivElement) => {
    scene.style.setProperty("--parallax-rx", "0deg");
    scene.style.setProperty("--parallax-ry", "0deg");
  };

  const handleScenePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      resetParallax(event.currentTarget);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const vertical = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    event.currentTarget.style.setProperty("--parallax-rx", `${((0.5 - vertical) * 4.8).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--parallax-ry", `${((horizontal - 0.5) * 6.4).toFixed(2)}deg`);
  };

  return (
    <section className="twin-panel" aria-labelledby="twin-title">
      <div className="panel-heading twin-heading">
        <div><span className="eyebrow">02 · Digital twin</span><h2 id="twin-title">Classroom digital twin</h2></div>
        <div className="twin-live-output" aria-label={`${modeledStateLabel}. ${formatEnergy(result.dailyEnergyKWh)} kilowatt-hours modeled energy per day`}>
          <span>{scenarioTitle ? "Scenario modeled load" : "Current modeled load"}</span><strong><AnimatedNumber value={result.dailyEnergyKWh} /> <small>kWh/day</small></strong>
        </div>
      </div>

      <div
        className={`room-scene spatial-room hvac-${hvacState} ${lightingState}${scenarioTitle ? " scenario-state" : ""}${causalFocusClass}`}
        style={sceneStyle}
        role="img"
        aria-label={`Classroom twin. Outdoor temperature ${config.outsideTemperatureC} degrees Celsius. Room target ${config.thermostatTemperatureC} degrees Celsius. ${config.occupants} people. HVAC ${hvacState}. Lighting ${lightingStateLabel}. Devices ${devicesState}. Modeled energy ${formatEnergy(result.dailyEnergyKWh)} kilowatt-hours per day.`}
        onPointerMove={handleScenePointerMove}
        onPointerLeave={(event) => resetParallax(event.currentTarget)}
      >
        <div className="twin-telemetry-grid" aria-hidden="true" />
        <div className="twin-reticle" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className={`twin-focus-annunciator${causalFocus ? " active" : ""}${scenarioTitle ? " scenario-active" : ""}`} role="status" aria-live="polite">
          <span>{causalFocus ? "Recommendation focus" : modeledStateLabel}</span>
          <strong>{causalFocus ?? (scenarioTitle ? hvacState.toUpperCase() : withinOperatingSchedule ? "LIVE" : "IDLE")}</strong>
        </div>
        <div className="room-spatial-stage" aria-hidden="true">
          <div className="room-atmosphere" />
          <div className="room-wall"><i className="wall-seam" /><i className="wall-rail" /></div>
          <div className="room-side-wall room-side-wall-left" />
          <div className="room-side-wall room-side-wall-right" />
          <div className="room-ceiling"><i /><i /></div>
          <div className="room-floor"><i /><i /><i /><b /><b /></div>
          <div className="window"><span /><i /><i /><b /><b /></div>

          <div className={`ceiling-lights${lightingFeedback ? " twin-state-feedback" : ""}${lightingCausalFocus ? " twin-causal-target" : ""}`} key={`lighting-${lightingFeedback ? feedbackToken : 0}`}>
            {[0, 1, 2].map((light) => <i className="ceiling-light" key={light}><b /></i>)}
          </div>

          <div className={`hvac-assembly${hvacFeedback ? " twin-state-feedback" : ""}${hvacCausalFocus ? " twin-causal-target" : ""}`} key={`hvac-${hvacFeedback ? feedbackToken : 0}`}>
            <div className={`hvac-unit ${hvacState}${hvacDrawingLoad ? " active" : hvacState === "off" ? " inactive" : ""}`}><span>≋</span><small>HVAC</small><b>{hvacState.toUpperCase()}</b></div>
            <svg className={`airflow-paths ${hvacState} ${hvacDrawingLoad ? "active" : "inactive"}`} viewBox="0 0 500 150" preserveAspectRatio="none">
              <path d="M492 22 C421 18 430 73 343 70 S210 37 126 82 S47 113 8 103" />
              <path d="M492 51 C430 57 417 112 326 104 S201 69 114 111 S39 137 10 129" />
              <path d="M492 81 C435 87 398 139 317 134 S205 107 143 132" />
            </svg>
          </div>

          <div className={`desks${occupancyFeedback ? " twin-state-feedback" : ""}`} key={`occupancy-${occupancyFeedback ? feedbackToken : 0}`}>
            {Array.from({ length: 12 }, (_, index) => (
              <div className={`desk ${index < occupants ? "occupied" : ""}`} key={index}>
                <span className={`desk-monitor ${!config.devicesEnabled ? "inactive" : devicesDrawingLoad ? "active" : "idle"}`} />
                <span className="person"><i /><b /></span>
              </div>
            ))}
          </div>

          {edgeNodeTelemetry ? (
            <div className={`edge-node-sensor freshness-${edgeNodeFreshness ?? "no-recent-data"}`}>
              <i /><span />
            </div>
          ) : null}
        </div>

        <div className={`outside-condition${temperatureFeedback ? " twin-state-feedback" : ""}`} key={`outside-${temperatureFeedback ? feedbackToken : 0}`}>
          <span>Outdoor input</span>
          <strong>{config.outsideTemperatureC}<small>°C</small></strong>
          <em>Climate condition</em>
          <div className="temperature-scale" aria-hidden="true"><i /><b /></div>
        </div>

        <div className={`room-label${roomFeedback ? " twin-state-feedback" : ""}`} key={`room-${roomFeedback ? feedbackToken : 0}`}>
          <strong>INTERACTIVE CLASSROOM</strong><span>{config.roomAreaM2} m²</span><span className="room-occupancy">{config.occupants} people</span>
        </div>

        {edgeNodeTelemetry ? (
          <div className={`edge-node-twin-telemetry freshness-${edgeNodeFreshness ?? "no-recent-data"}`} role="status" aria-label={`EcoTwin Edge Node. Measured temperature ${edgeNodeTelemetry.temperatureC} degrees Celsius. Measured humidity ${edgeNodeTelemetry.humidityPercent} percent relative humidity. ${edgeNodeStatusLabel}.`}>
            <span>EDGE NODE</span>
            <strong><AnimatedNumber value={edgeNodeTelemetry.temperatureC} />°C <i>·</i> <AnimatedNumber value={edgeNodeTelemetry.humidityPercent} maximumFractionDigits={1} />% RH</strong>
            <em>{edgeNodeStatusLabel}</em>
          </div>
        ) : null}

        <div className="thermal-guide" aria-hidden="true"><span>OUTSIDE</span><i /><b>ROOM TARGET</b></div>
        <span className={`lighting-state-label${lightingFeedback ? " twin-state-feedback" : ""}`}>Lighting <b>{lightingStateLabel}</b></span>

        <div className={`thermostat${temperatureFeedback ? " twin-state-feedback" : ""}${hvacCausalFocus ? " twin-causal-target" : ""}`} key={`target-${temperatureFeedback ? feedbackToken : 0}`}><span>ROOM TARGET</span><b><AnimatedNumber value={config.thermostatTemperatureC} maximumFractionDigits={1} />°C</b></div>

        <div className={`device-bank ${!config.devicesEnabled ? "inactive" : devicesDrawingLoad ? "active" : "idle"}${devicesFeedback ? " twin-state-feedback" : ""}${devicesCausalFocus ? " twin-causal-target" : ""}`} key={`devices-${devicesFeedback ? feedbackToken : 0}`}>
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M9 20h6M12 16v4" /></svg></span>
          <small>DEVICES {devicesStatusLabel.toUpperCase()}</small>
          <strong><AnimatedNumber value={config.devicePowerW / 1000} /> kW</strong>
          <div className="device-level" aria-hidden="true">{[1, 2, 3].map((bar) => <i className={bar <= deviceBars ? "active" : ""} key={bar} />)}</div>
        </div>

        <div className="energy-trace" aria-label="Daily modeled energy by classroom system">
          <span className="trace-kicker">Daily load</span>
          <div className={`trace-system trace-hvac${hvacFeedback ? " twin-state-feedback" : ""}${hvacCausalFocus ? " twin-causal-target" : ""}`} key={`trace-hvac-${hvacFeedback ? feedbackToken : 0}`}><i /><span>HVAC</span><strong><AnimatedNumber value={result.hvacEnergyKWh} /> <small>kWh</small></strong></div>
          <div className={`trace-system trace-devices${devicesFeedback ? " twin-state-feedback" : ""}${devicesCausalFocus ? " twin-causal-target" : ""}`} key={`trace-devices-${devicesFeedback ? feedbackToken : 0}`}><i /><span>Devices</span><strong><AnimatedNumber value={result.deviceEnergyKWh} /> <small>kWh</small></strong></div>
          <div className={`trace-system trace-lighting${lightingFeedback ? " twin-state-feedback" : ""}${lightingCausalFocus ? " twin-causal-target" : ""}`} key={`trace-lighting-${lightingFeedback ? feedbackToken : 0}`}><i /><span>Lighting</span><strong><AnimatedNumber value={result.lightingEnergyKWh} /> <small>kWh</small></strong></div>
          <div className="trace-total"><span>MODELED ENERGY</span><strong><AnimatedNumber value={result.dailyEnergyKWh} /> <small>kWh/day</small></strong></div>
        </div>
      </div>
    </section>
  );
}
