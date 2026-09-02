import type { ClassroomConfig } from "@/lib/simulation";
import type { ContextSnapshot, Location } from "@/lib/context/types";
import {
  CLASSROOM_CONFIG_INPUT_RULES,
  type ClassroomConfigNumberKey,
} from "@/lib/validation/classroomConfig";
import { WeatherContextControl } from "./weather/WeatherContextControl";

type Props = {
  config: ClassroomConfig;
  onChange: <K extends keyof ClassroomConfig>(key: K, value: ClassroomConfig[K]) => void;
  onReset: () => void;
  contextNote?: string;
  weatherContext: Readonly<ContextSnapshot> | null;
  weatherLoading: boolean;
  weatherLocation: Readonly<Location>;
  onWeatherRefresh: () => void;
  manualOutdoorRelativeHumidityPercent: number | null;
  onManualOutdoorRelativeHumidityChange: (value: number | null) => void;
};

function RangeControl({ configKey, label, value, step = 1, unit, onChange }: { configKey: ClassroomConfigNumberKey; label: string; value: number; step?: number; unit: string; onChange: (value: number) => void }) {
  const { minimum, maximum } = CLASSROOM_CONFIG_INPUT_RULES[configKey];
  const valueText = `${value}${unit ? ` ${unit}` : ""}`;
  return <label className="range-control"><span>{label}</span><span className="range-value"><input aria-label={`${label} numeric value${unit ? ` in ${unit}` : ""}`} type="number" value={value} min={minimum} max={maximum} step={step} onChange={(e) => onChange(e.currentTarget.valueAsNumber)} />{unit}</span><input aria-label={label} aria-valuetext={valueText} type="range" value={value} min={minimum} max={maximum} step={step} onChange={(e) => onChange(e.currentTarget.valueAsNumber)} /></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="toggle" aria-hidden="true" /></label>;
}

export function ClassroomControls({ config, onChange, onReset, contextNote, weatherContext, weatherLoading, weatherLocation, onWeatherRefresh, manualOutdoorRelativeHumidityPercent, onManualOutdoorRelativeHumidityChange }: Props) {
  return <section className="controls-panel" aria-labelledby="configuration-title">
    <div className="panel-heading"><div><span className="eyebrow">Detailed inputs</span><h2 id="configuration-title">Classroom controls</h2>{contextNote ? <p className="control-context-note">{contextNote}</p> : null}</div><button type="button" className="reset-button" onClick={onReset}><span aria-hidden="true">↺</span> Reset defaults</button></div>
    <div className="control-groups">
      <fieldset><legend>Classroom</legend><RangeControl configKey="roomAreaM2" label="Room area" value={config.roomAreaM2} unit="m²" onChange={(v) => onChange("roomAreaM2", v)} /><RangeControl configKey="occupants" label="Occupants" value={config.occupants} unit="" onChange={(v) => onChange("occupants", v)} /><RangeControl configKey="operatingHoursPerDay" label="Operating hours / day" value={config.operatingHoursPerDay} unit="h" onChange={(v) => onChange("operatingHoursPerDay", v)} /><RangeControl configKey="operatingDaysPerMonth" label="Operating days / month" value={config.operatingDaysPerMonth} unit="days" onChange={(v) => onChange("operatingDaysPerMonth", v)} /><RangeControl configKey="operatingDaysPerYear" label="Operating days / year" value={config.operatingDaysPerYear} unit="days" onChange={(v) => onChange("operatingDaysPerYear", v)} /></fieldset>
      <fieldset><legend>Climate & HVAC</legend><RangeControl configKey="outsideTemperatureC" label="Outdoor temperature" value={config.outsideTemperatureC} unit="°C" onChange={(v) => onChange("outsideTemperatureC", v)} /><RangeControl configKey="thermostatTemperatureC" label="Thermostat target" value={config.thermostatTemperatureC} unit="°C" onChange={(v) => onChange("thermostatTemperatureC", v)} /><Toggle label="HVAC enabled" checked={config.hvacEnabled} onChange={(v) => onChange("hvacEnabled", v)} /><WeatherContextControl context={weatherContext} isLoading={weatherLoading} manualTemperature={config.outsideTemperatureC} manualRelativeHumidityPercent={manualOutdoorRelativeHumidityPercent} referenceLocation={weatherLocation} onRefresh={onWeatherRefresh} onManualRelativeHumidityChange={onManualOutdoorRelativeHumidityChange} /></fieldset>
      <fieldset><legend>Lighting</legend><RangeControl configKey="lightingLevelPercent" label="Lighting level" value={config.lightingLevelPercent} unit="%" onChange={(v) => onChange("lightingLevelPercent", v)} /><RangeControl configKey="lightingPowerDensityWPerM2" label="Lighting power density" value={config.lightingPowerDensityWPerM2} step={0.5} unit="W/m²" onChange={(v) => onChange("lightingPowerDensityWPerM2", v)} /><Toggle label="Lights enabled" checked={config.lightsEnabled} onChange={(v) => onChange("lightsEnabled", v)} /></fieldset>
      <fieldset><legend>Devices</legend><RangeControl configKey="devicePowerW" label="Device power" value={config.devicePowerW} step={100} unit="W" onChange={(v) => onChange("devicePowerW", v)} /><Toggle label="Devices enabled" checked={config.devicesEnabled} onChange={(v) => onChange("devicesEnabled", v)} /></fieldset>
    </div>
  </section>;
}
