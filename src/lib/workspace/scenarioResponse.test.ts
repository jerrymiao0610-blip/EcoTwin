import { describe, expect, it } from "vitest";
import { runDecisionPipeline } from "../decision/pipeline";
import type { OptimizerConstraints } from "../optimizer/types";
import {
  DEFAULT_CLASSROOM_CONFIG,
  type ClassroomConfig,
} from "../simulation";
import { buildScenarioResponse } from "./buildScenarioResponse";
import { buildScenarioWorkspaceModels } from "./buildScenarioWorkspace";
import type { ScenarioWorkspaceModel } from "./scenarioTypes";

function scenarioFor(
  id: ScenarioWorkspaceModel["id"],
  baseline: Readonly<ClassroomConfig> = DEFAULT_CLASSROOM_CONFIG,
): ScenarioWorkspaceModel {
  const scenario = buildScenarioWorkspaceModels(baseline).find(
    (candidate) => candidate.id === id,
  );

  if (!scenario) throw new Error(`Missing scenario workspace model: ${id}`);
  return scenario;
}

describe("buildScenarioResponse", () => {
  it("uses the Heatwave scenario configuration as the decision baseline", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const response = buildScenarioResponse(scenario);

    expect(response.scenarioBaseline.configuration).toEqual(
      scenario.scenario.configuration,
    );
    expect(response.scenarioBaseline.configuration.outsideTemperatureC).toBe(
      scenario.scenario.configuration.outsideTemperatureC,
    );
    expect(response.scenarioBaseline.configuration).not.toEqual(
      scenario.baseline.configuration,
    );
  });

  it("delegates the Heatwave response to the existing decision pipeline", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const decision = runDecisionPipeline(scenario.scenario.configuration);
    const response = buildScenarioResponse(scenario);

    expect(response.scenarioBaseline.energyKWh.daily).toBe(
      decision.baselineSimulation.dailyEnergyKWh,
    );
    expect(response.optimizedResponse.configuration).toEqual(
      decision.metadata.optimizedConfiguration,
    );
    expect(response.optimizedResponse.energyKWh.daily).toBe(
      decision.optimizedSimulation.dailyEnergyKWh,
    );
    expect(response.impact).toEqual(decision.impactReport);
    expect(response.evidence.pipeline.optimizerSearchSpaceSize).toBe(
      decision.metadata.optimizerSearchSpaceSize,
    );
  });

  it("uses the occupancy-zero Empty Classroom state", () => {
    const scenario = scenarioFor("empty-classroom");
    const response = buildScenarioResponse(scenario);

    expect(response.scenarioBaseline.configuration.occupants).toBe(0);
    expect(response.optimizedResponse.configuration.occupants).toBe(0);
  });

  it("does not force Empty Classroom HVAC off", () => {
    const scenario = scenarioFor("empty-classroom");
    const response = buildScenarioResponse(scenario);
    const decision = runDecisionPipeline(scenario.scenario.configuration);

    expect(response.scenarioBaseline.configuration.hvacEnabled).toBe(
      scenario.scenario.configuration.hvacEnabled,
    );
    expect(response.scenarioBaseline.hvacMode).toBe(
      decision.baselineSimulation.hvacMode,
    );
    expect(response.scenarioBaseline.dailyEnergyByComponent.hvacKWh).toBe(
      decision.baselineSimulation.hvacEnergyKWh,
    );
  });

  it("re-evaluates Eco Mode honestly without scenario-ID special casing", () => {
    const scenario = scenarioFor("eco-mode");
    const decision = runDecisionPipeline(scenario.scenario.configuration);
    const response = buildScenarioResponse(scenario);

    expect(response.optimizedResponse.configuration).toEqual(
      decision.metadata.optimizedConfiguration,
    );
    expect(response.recommendations).toEqual(decision.recommendations);
    expect(response.status).toBe("already-at-modeled-plan");
    expect(response.statusText).toBe(
      "Already at the modeled EcoTwin plan",
    );
    expect(response.energyDelta.outcomeText).toBe(
      "No further modeled improvement",
    );
  });

  it("does not mutate the original baseline configuration", () => {
    const baseline: ClassroomConfig = { ...DEFAULT_CLASSROOM_CONFIG };
    const original = structuredClone(baseline);
    const scenario = scenarioFor("heatwave-tomorrow", baseline);

    buildScenarioResponse(scenario);

    expect(baseline).toEqual(original);
  });

  it("does not mutate the ScenarioWorkspaceModel", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const original = structuredClone(scenario);

    buildScenarioResponse(scenario);

    expect(scenario).toEqual(original);
  });

  it("returns outputs detached from the source scenario and other builds", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const first = buildScenarioResponse(scenario);
    const second = buildScenarioResponse(scenario);

    expect(first).not.toBe(second);
    expect(first.scenarioBaseline.configuration).not.toBe(
      scenario.scenario.configuration,
    );
    expect(first.evidence.sourceScenario).not.toBe(scenario.evidence);
    expect(first.evidence.sourceScenario.scenarioDefinition).not.toBe(
      scenario.evidence.scenarioDefinition,
    );
    expect(first.recommendations).not.toBe(second.recommendations);
    expect(first.impact.energyKWh).not.toBe(second.impact.energyKWh);

    first.scenarioBaseline.configuration.occupants = -999;
    first.evidence.sourceScenario.scenarioDefinition.name = "Changed";
    first.impact.energyKWh.daily.difference = -999;

    expect(second).toEqual(buildScenarioResponse(scenario));
    expect(scenario).toEqual(scenarioFor("heatwave-tomorrow"));
  });

  it("is deterministic for repeated equivalent inputs", () => {
    const firstScenario = scenarioFor("heatwave-tomorrow");
    const secondScenario = scenarioFor("heatwave-tomorrow", {
      ...DEFAULT_CLASSROOM_CONFIG,
    });

    expect(buildScenarioResponse(firstScenario)).toEqual(
      buildScenarioResponse(secondScenario),
    );
  });

  it("uses improvement semantics without presenting negative consumption", () => {
    const response = buildScenarioResponse(
      scenarioFor("heatwave-tomorrow"),
    );
    const source = response.impact.energyKWh.daily;

    expect(response.energyDelta).toMatchObject({
      signedValue: source.difference,
      magnitude: Math.abs(source.difference),
      percentageChange: source.percentageChange,
      percentageMagnitude: Math.abs(source.percentageChange ?? 0),
      direction: "improvement",
      valueQualifier: "saved",
      comparisonQualifier: "lower",
      outcomeText: "Energy avoided",
    });
    expect(response.energyDelta.amountText).toMatch(/kWh\/day avoided$/);
    expect(response.energyDelta.comparisonText).toMatch(
      /% lower than the unmitigated scenario$/,
    );
    expect(response.energyDelta.amountText).not.toContain("-");
  });

  it("uses additional-energy semantics when supplied constraints degrade the scenario", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const degradingConstraints: OptimizerConstraints = {
      thermostatTemperatureC: { minimum: 20, maximum: 20, step: 1 },
      lightingLevelPercent: { minimum: 100, maximum: 100, step: 10 },
      devicePowerW: {
        minimumPerOccupant: 100,
        maximumPerOccupant: 100,
        stepPerOccupant: 5,
      },
    };
    const response = buildScenarioResponse(scenario, {
      optimizerConstraints: degradingConstraints,
    });

    expect(response.impact.direction).toBe("degradation");
    expect(response.energyDelta).toMatchObject({
      direction: "degradation",
      valueQualifier: "additional",
      comparisonQualifier: "higher",
      outcomeText: "Additional energy",
    });
    expect(response.energyDelta.amountText).toMatch(
      /kWh\/day additional energy$/,
    );
    expect(response.energyDelta.comparisonText).toMatch(
      /% higher than the unmitigated scenario$/,
    );
    expect(response.energyDelta.amountText).not.toContain("-");
  });

  it("derives neutral status only from a no-change DecisionPackage", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const config = scenario.scenario.configuration;
    const lockedConstraints: OptimizerConstraints = {
      thermostatTemperatureC: {
        minimum: config.thermostatTemperatureC,
        maximum: config.thermostatTemperatureC,
        step: 1,
      },
      lightingLevelPercent: {
        minimum: config.lightingLevelPercent,
        maximum: config.lightingLevelPercent,
        step: 10,
      },
      devicePowerW: {
        minimumPerOccupant: config.devicePowerW / config.occupants,
        maximumPerOccupant: config.devicePowerW / config.occupants,
        stepPerOccupant: 5,
      },
    };
    const decision = runDecisionPipeline(config, {
      optimizerConstraints: lockedConstraints,
    });
    const response = buildScenarioResponse(scenario, {
      optimizerConstraints: lockedConstraints,
    });

    expect(decision.metadata.changedParameterCount).toBe(0);
    expect(decision.impactReport.direction).toBe("neutral");
    expect(response.status).toBe("already-at-modeled-plan");
    expect(response.energyDelta).toMatchObject({
      signedValue: 0,
      magnitude: 0,
      percentageChange: 0,
      percentageMagnitude: 0,
      direction: "neutral",
      amountText: "No further modeled improvement",
      comparisonText: "No further modeled improvement",
    });
  });

  it("preserves scenario IDs and the explicit comparison basis", () => {
    for (const scenario of buildScenarioWorkspaceModels(
      DEFAULT_CLASSROOM_CONFIG,
    )) {
      const response = buildScenarioResponse(scenario);

      expect(response.scenarioId).toBe(scenario.id);
      expect(response.comparisonBasis).toEqual({
        baseline: "scenario-without-response",
        candidate: "ecotwin-response",
        label: "Scenario without response vs EcoTwin response",
      });
    }
  });

  it("keeps every recommendation traceable to DecisionPackage evidence", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    const decision = runDecisionPipeline(scenario.scenario.configuration);
    const response = buildScenarioResponse(scenario);

    expect(response.recommendations).toEqual(decision.recommendations);
    expect(response.recommendations).not.toBe(decision.recommendations);

    for (const [index, recommendation] of response.recommendations.entries()) {
      expect(recommendation.parameterChange).toEqual(
        decision.recommendations[index].parameterChange,
      );
      expect(recommendation.evidence).toEqual(
        decision.recommendations[index].evidence,
      );
      expect(recommendation.evidence).not.toBe(
        decision.recommendations[index].evidence,
      );
    }
  });

  it("retains annual impacts, assumptions, provenance, and warnings", () => {
    const scenario = scenarioFor("heatwave-tomorrow");
    scenario.warnings.push("Source warning");
    const decision = runDecisionPipeline(scenario.scenario.configuration);
    const response = buildScenarioResponse(scenario);

    expect(response.annualImpact).toEqual({
      energyKWh: decision.impactReport.energyKWh.annual,
      co2Kg: decision.impactReport.co2Kg.annual,
      cost: decision.impactReport.cost.annual,
    });
    expect(response.evidence.sourceScenario).toEqual(scenario.evidence);
    expect(response.evidence.pipeline.version).toBe(
      decision.metadata.pipelineVersion,
    );
    expect(response.evidence.baselineAssumptions).toEqual(
      decision.baselineSimulation.assumptions,
    );
    expect(response.evidence.optimizedAssumptions).toEqual(
      decision.optimizedSimulation.assumptions,
    );
    expect(response.warnings).toEqual(["Source warning"]);
    expect(response.warnings).not.toBe(scenario.warnings);
  });
});
