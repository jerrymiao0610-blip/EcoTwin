import type { SimulationResult } from "@/lib/simulation";

const colours = { HVAC: "#57a7a1", Devices: "#f0ab5a", Lighting: "#7b90d7" };
export function EnergyBreakdown({ result }: { result: SimulationResult }) {
  const items: { label: keyof typeof colours; value: number }[] = [{ label: "HVAC", value: result.hvacEnergyKWh }, { label: "Devices", value: result.deviceEnergyKWh }, { label: "Lighting", value: result.lightingEnergyKWh }];
  const total = result.dailyEnergyKWh;
  return <section className="breakdown-panel" aria-labelledby="breakdown-title"><div className="panel-heading"><div><span className="eyebrow">Daily electricity</span><h2 id="breakdown-title">Energy breakdown</h2></div><span className="modelled-label">Modelled estimate</span></div><div className="breakdown-list">{items.map((item) => { const percent = total ? (item.value / total) * 100 : 0; return <div className="breakdown-item" key={item.label}><div className="breakdown-label"><span><i style={{ backgroundColor: colours[item.label] }} />{item.label}</span><b>{item.value.toFixed(1)} <small>kWh/day</small></b></div><div className="bar-track"><div className="bar-fill" style={{ width: `${percent}%`, backgroundColor: colours[item.label] }} /></div><span className="percentage">{percent.toFixed(0)}% of total electricity</span></div>; })}</div></section>;
}
