import type { SimulationResult } from "@/lib/simulation";

const colours = { HVAC: "var(--system-hvac)", Devices: "var(--system-devices)", Lighting: "var(--system-lighting)" };
export type BreakdownCategory = keyof typeof colours;

export function EnergyBreakdown({ result, highlightedItems = [], feedbackToken = 0 }: { result: SimulationResult; highlightedItems?: BreakdownCategory[]; feedbackToken?: number }) {
  const items: { label: keyof typeof colours; value: number }[] = [{ label: "HVAC", value: result.hvacEnergyKWh }, { label: "Devices", value: result.deviceEnergyKWh }, { label: "Lighting", value: result.lightingEnergyKWh }];
  const total = result.dailyEnergyKWh;
  return <section className="breakdown-panel" aria-labelledby="breakdown-title"><div className="panel-heading"><div><span className="eyebrow">03 · Understand room load</span><h2 id="breakdown-title">Energy breakdown</h2></div><span className="modelled-label">Modelled estimate</span></div><div className="breakdown-list">{items.map((item) => { const percent = total ? (item.value / total) * 100 : 0; const highlighted = highlightedItems.includes(item.label); return <div className={`breakdown-item${highlighted ? " breakdown-item-feedback" : ""}`} key={`${item.label}-${highlighted ? feedbackToken : 0}`}><div className="breakdown-label"><span><i style={{ backgroundColor: colours[item.label] }} />{item.label}</span><b>{item.value.toFixed(1)} <small>kWh/day</small></b></div><div className="bar-track"><div className="bar-fill" style={{ width: `${percent}%`, backgroundColor: colours[item.label] }} /></div><span className="percentage">{percent.toFixed(0)}% of total electricity</span></div>; })}</div></section>;
}
