import type { ClassroomConfig } from "@/lib/simulation";

type Props = { config: ClassroomConfig; onChange: <K extends keyof ClassroomConfig>(key: K, value: ClassroomConfig[K]) => void; onReset: () => void };

function RangeControl({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (value: number) => void }) {
  return <label className="range-control"><span>{label}</span><span className="range-value"><input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />{unit}</span><input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span className="toggle" aria-hidden="true" /></label>;
}

export function ClassroomControls({ config, onChange, onReset }: Props) {
  return <section className="controls-panel" aria-labelledby="configuration-title">
    <div className="panel-heading"><div><span className="eyebrow">Live inputs</span><h2 id="configuration-title">Classroom configuration</h2></div><button type="button" className="reset-button" onClick={onReset}>↺ Reset defaults</button></div>
    <div className="control-groups">
      <fieldset><legend>Classroom</legend><RangeControl label="Room area" value={config.roomAreaM2} min={10} max={250} unit="m²" onChange={(v) => onChange("roomAreaM2", v)} /><RangeControl label="Occupants" value={config.occupants} min={0} max={100} unit="" onChange={(v) => onChange("occupants", v)} /><RangeControl label="Operating hours / day" value={config.operatingHoursPerDay} min={0} max={16} unit="h" onChange={(v) => onChange("operatingHoursPerDay", v)} /><RangeControl label="Operating days / month" value={config.operatingDaysPerMonth} min={0} max={31} unit="days" onChange={(v) => onChange("operatingDaysPerMonth", v)} /><RangeControl label="Operating days / year" value={config.operatingDaysPerYear} min={0} max={366} unit="days" onChange={(v) => onChange("operatingDaysPerYear", v)} /></fieldset>
      <fieldset><legend>Climate & cooling</legend><RangeControl label="Outdoor temperature" value={config.outsideTemperatureC} min={-10} max={45} unit="°C" onChange={(v) => onChange("outsideTemperatureC", v)} /><RangeControl label="Thermostat target" value={config.thermostatTemperatureC} min={16} max={30} unit="°C" onChange={(v) => onChange("thermostatTemperatureC", v)} /><Toggle label="HVAC enabled" checked={config.hvacEnabled} onChange={(v) => onChange("hvacEnabled", v)} /></fieldset>
      <fieldset><legend>Lighting</legend><RangeControl label="Lighting level" value={config.lightingLevelPercent} min={0} max={100} unit="%" onChange={(v) => onChange("lightingLevelPercent", v)} /><RangeControl label="Lighting power density" value={config.lightingPowerDensityWPerM2} min={0} max={25} step={0.5} unit="W/m²" onChange={(v) => onChange("lightingPowerDensityWPerM2", v)} /><Toggle label="Lights enabled" checked={config.lightsEnabled} onChange={(v) => onChange("lightsEnabled", v)} /></fieldset>
      <fieldset><legend>Devices</legend><RangeControl label="Device power" value={config.devicePowerW} min={0} max={6000} step={100} unit="W" onChange={(v) => onChange("devicePowerW", v)} /><Toggle label="Devices enabled" checked={config.devicesEnabled} onChange={(v) => onChange("devicesEnabled", v)} /></fieldset>
    </div>
  </section>;
}
