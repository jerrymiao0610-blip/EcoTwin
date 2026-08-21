import type { ClassroomConfig } from "@/lib/simulation";

export function ClassroomTwin({ config }: { config: ClassroomConfig }) {
  const occupants = Math.min(12, Math.max(0, Math.round(config.occupants / 3)));
  return <section className="twin-panel" aria-labelledby="twin-title"><div className="panel-heading"><div><span className="eyebrow">Interactive model</span><h2 id="twin-title">Classroom digital twin</h2></div><span className={`status-dot ${config.hvacEnabled ? "on" : "off"}`}>{config.hvacEnabled ? "HVAC active" : "HVAC off"}</span></div><div className={`room-scene ${config.lightsEnabled ? "lights-on" : "lights-off"}`}>
    <div className="outdoor-temperature">Outside <b>{config.outsideTemperatureC}°C</b></div><div className="room-label">ROOM 204 <span>{config.roomAreaM2} m²</span></div>
    <div className={`hvac-unit ${config.hvacEnabled ? "active" : ""}`}><span>≋</span><small>HVAC</small></div><div className="thermostat"><span>THERMOSTAT</span><b>{config.thermostatTemperatureC}°</b></div>
    <div className="ceiling-lights"><i /><i /><i /></div><div className="window"><span /></div>
    <div className="desks">{Array.from({ length: 12 }, (_, i) => <div className={`desk ${i < occupants ? "occupied" : ""}`} key={i}><i /></div>)}</div>
    <div className={`device-bank ${config.devicesEnabled ? "active" : ""}`}><span>▣</span><small>DEVICES</small></div>
    <div className="scene-legend"><span><i className={config.lightsEnabled ? "active" : ""} />Lights</span><span><i className={config.devicesEnabled ? "active" : ""} />Devices</span><span>{config.occupants} occupants</span></div>
  </div></section>;
}
