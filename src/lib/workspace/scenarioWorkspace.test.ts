import { describe, expect, it } from "vitest";
import { compareSimulationResults } from "../impact/impact";
import {
  BUILT_IN_SCENARIO_IDS,
  HEATWAVE_TEMPERATURE_INCREASE_C,
  simulateScenario,
} from "../scenarios/scenarios";
import {
  DEFAULT_CLASSROOM_CONFIG,
  type ClassroomConfig,
} from "../simulation";
import { buildScenarioWorkspaceModels } from "./buildScenarioWorkspace";

function modelFor(id: (typeof BUILT_IN_SCENARIO_IDS)[number]) {
  const model = buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG).find(
    (candidate) => candidate.id === id,
  );

  if (!model) throw new Error(`Missing scenario workspace model: ${id}`);
  return model;
}

describe("buildScenarioWorkspaceModels", () => {
  it("maps Heatwave Tomorrow directly from the existing scenario engine", () => {
    const source = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "heatwave-tomorrow",
    );
    const model = modelFor("heatwave-tomorrow");

    expect(model).toMatchObject({
      id: "heatwave-tomorrow",
      title: source.scenario.name,
      description: source.scenario.description,
      changes: source.changes,
    });
    expect(model.scenario.configuration.outsideTemperatureC).toBe(
      DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC +
        HEATWAVE_TEMPERATURE_INCREASE_C,
    );
    expect(model.scenario.energyKWh.daily).toBe(
      source.scenarioSimulation.dailyEnergyKWh,
    );
    expect(model.evidence.scenarioComparison).toEqual(source.comparison);
  });

  it("maps Empty Classroom without assuming that HVAC is off", () => {
    const source = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "empty-classroom",
    );
    const model = modelFor("empty-classroom");

    expect(model.changes).toEqual(source.changes);
    expect(model.scenario.configuration.occupants).toBe(0);
    expect(model.scenario.hvacMode).toBe(source.scenarioSimulation.hvacMode);
    expect(model.scenario.dailyEnergyByComponent.hvacKWh).toBe(
      source.scenarioSimulation.hvacEnergyKWh,
    );
  });

  it("maps Eco Mode from the optimizer-backed scenario result", () => {
    const source = simulateScenario(DEFAULT_CLASSROOM_CONFIG, "eco-mode");
    const model = modelFor("eco-mode");

    expect(model.changes).toEqual(source.changes);
    expect(model.scenario.configuration).toEqual(
      source.scenarioConfiguration,
    );
    expect(model.scenario.energyKWh.daily).toBe(
      source.scenarioSimulation.dailyEnergyKWh,
    );
  });

  it("uses the comparison API for energy, CO2, cost, and component impacts", () => {
    const source = simulateScenario(DEFAULT_CLASSROOM_CONFIG, "eco-mode");
    const expectedImpact = compareSimulationResults(
      source.baselineSimulation,
      source.scenarioSimulation,
    );
    const model = modelFor("eco-mode");

    expect(model.impact).toEqual(expectedImpact);
    expect(model.direction).toBe(expectedImpact.direction);
    expect(model.impact.components.map(({ component }) => component)).toEqual([
      "hvac",
      "lighting",
      "devices",
    ]);
  });

  it("does not mutate the baseline input", () => {
    const baseline: ClassroomConfig = { ...DEFAULT_CLASSROOM_CONFIG };
    const snapshot = structuredClone(baseline);

    buildScenarioWorkspaceModels(baseline);

    expect(baseline).toEqual(snapshot);
  });

  it("returns fully detached scenario outputs", () => {
    const first = buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG);
    const second = buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG);

    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(first[0].changes).not.toBe(second[0].changes);
    expect(first[0].baseline.configuration).not.toBe(
      second[0].baseline.configuration,
    );
    expect(first[0].impact.energyKWh).not.toBe(second[0].impact.energyKWh);
    expect(first[0].evidence.scenarioDefinition).not.toBe(
      second[0].evidence.scenarioDefinition,
    );
    expect(first[0].evidence.baselineAssumptions).not.toBe(
      second[0].evidence.baselineAssumptions,
    );

    first[0].changes[0].after = -999;
    first[0].baseline.configuration.occupants = -999;
    first[0].impact.energyKWh.daily.difference = -999;
    first[0].evidence.baselineAssumptions.hvacCop = -999;

    expect(second).toEqual(
      buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG),
    );
  });

  it("is deterministic for repeated equivalent inputs", () => {
    const equivalentBaseline = { ...DEFAULT_CLASSROOM_CONFIG };

    expect(buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG)).toEqual(
      buildScenarioWorkspaceModels(equivalentBaseline),
    );
  });

  it("presents improvements as a positive magnitude and energy saved", () => {
    const model = modelFor("eco-mode");

    expect(model.energyDelta).toMatchObject({
      signedValue: model.impact.energyKWh.daily.difference,
      magnitude: Math.abs(model.impact.energyKWh.daily.difference),
      direction: "improvement",
      valueQualifier: "saved",
      comparisonQualifier: "lower",
      unit: "kWh/day",
      outcomeText: "Energy saved",
    });
    expect(model.energyDelta.comparisonText).toMatch(/kWh\/day lower$/);
    expect(model.energyDelta.comparisonText).not.toContain("-");
  });

  it("presents degradations as additional energy", () => {
    const model = modelFor("heatwave-tomorrow");

    expect(model.energyDelta).toMatchObject({
      signedValue: model.impact.energyKWh.daily.difference,
      magnitude: model.impact.energyKWh.daily.difference,
      direction: "degradation",
      valueQualifier: "additional",
      comparisonQualifier: "higher",
      unit: "kWh/day",
      outcomeText: "Additional energy",
    });
    expect(model.energyDelta.comparisonText).toMatch(/kWh\/day higher$/);
  });

  it("presents a representable zero-impact scenario as neutral", () => {
    const zeroEnergyBaseline: ClassroomConfig = {
      ...DEFAULT_CLASSROOM_CONFIG,
      hvacEnabled: false,
      lightsEnabled: false,
      devicesEnabled: false,
    };
    const [model] = buildScenarioWorkspaceModels(zeroEnergyBaseline, [
      "heatwave-tomorrow",
    ]);

    expect(model.direction).toBe("neutral");
    expect(model.energyDelta).toEqual({
      signedValue: 0,
      magnitude: 0,
      direction: "neutral",
      valueQualifier: null,
      comparisonQualifier: "unchanged",
      unit: "kWh/day",
      comparisonText: "No modeled change",
      outcomeText: "No modeled change",
    });
  });

  it("preserves the stable built-in scenario order and IDs", () => {
    const models = buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG);

    expect(models.map(({ id }) => id)).toEqual(BUILT_IN_SCENARIO_IDS);
    expect(models.map(({ evidence }) => evidence.scenarioDefinition.id)).toEqual(
      BUILT_IN_SCENARIO_IDS,
    );
  });

  it("reflects the engine's higher cooling load for the default heatwave", () => {
    const source = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "heatwave-tomorrow",
    );
    const model = modelFor("heatwave-tomorrow");

    expect(source.baselineSimulation.hvacMode).toBe("cooling");
    expect(source.scenarioSimulation.hvacEnergyKWh).toBeGreaterThan(
      source.baselineSimulation.hvacEnergyKWh,
    );
    expect(model.scenario.dailyEnergyByComponent.hvacKWh).toBe(
      source.scenarioSimulation.hvacEnergyKWh,
    );
    expect(model.scenario.energyKWh.daily).toBeGreaterThan(
      model.baseline.energyKWh.daily,
    );
  });

  it("retains complete simulator assumptions and has no metadata warnings", () => {
    const source = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "heatwave-tomorrow",
    );
    const model = modelFor("heatwave-tomorrow");

    expect(model.evidence.baselineAssumptions).toEqual(
      source.baselineSimulation.assumptions,
    );
    expect(model.evidence.scenarioAssumptions).toEqual(
      source.scenarioSimulation.assumptions,
    );
    expect(model.warnings).toEqual([]);
  });
});
