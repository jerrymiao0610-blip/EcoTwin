import { describe, expect, it } from "vitest";
import { compareSimulationResults } from "../impact/impact";
import { optimizeClassroomEnergy } from "../optimizer/optimizer";
import type { OptimizerConstraints } from "../optimizer/types";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from "../simulation";
import { createTwinSnapshot } from "../twin/twin";
import type { TwinSnapshot } from "../twin/types";
import {
  DECISION_PIPELINE_VERSION,
  runDecisionPipeline,
  runTwinDecisionPipeline,
} from "./pipeline";
import { twinSnapshotToClassroomConfig } from "./twinAdapter";

function createEquivalentTwin(): TwinSnapshot {
  return createTwinSnapshot({
    definition: {
      id: "classroom-101",
      name: "Science Classroom 101",
      physicalProperties: {
        roomAreaM2: DEFAULT_CLASSROOM_CONFIG.roomAreaM2,
        lightingPowerDensityWPerM2:
          DEFAULT_CLASSROOM_CONFIG.lightingPowerDensityWPerM2,
      },
    },
    state: {
      thermostatTemperatureC:
        DEFAULT_CLASSROOM_CONFIG.thermostatTemperatureC,
      lightingLevelPercent: DEFAULT_CLASSROOM_CONFIG.lightingLevelPercent,
      devicePowerW: DEFAULT_CLASSROOM_CONFIG.devicePowerW,
      hvacEnabled: DEFAULT_CLASSROOM_CONFIG.hvacEnabled,
      lightsEnabled: DEFAULT_CLASSROOM_CONFIG.lightsEnabled,
      devicesEnabled: DEFAULT_CLASSROOM_CONFIG.devicesEnabled,
    },
    context: {
      occupants: DEFAULT_CLASSROOM_CONFIG.occupants,
      outsideTemperatureC: DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC,
      operatingHoursPerDay: DEFAULT_CLASSROOM_CONFIG.operatingHoursPerDay,
      operatingDaysPerMonth: DEFAULT_CLASSROOM_CONFIG.operatingDaysPerMonth,
      operatingDaysPerYear: DEFAULT_CLASSROOM_CONFIG.operatingDaysPerYear,
      electricityPricePerKWh:
        DEFAULT_CLASSROOM_CONFIG.electricityPricePerKWh,
      carbonIntensityKgPerKWh:
        DEFAULT_CLASSROOM_CONFIG.carbonIntensityKgPerKWh,
    },
    capturedAt: "2026-08-23T10:30:00.000Z",
    provenance: {
      source: "open-meteo",
      sourceVersion: "phase-7a",
    },
  });
}

describe("runDecisionPipeline", () => {
  it("completes the simulation, optimization, impact, and recommendation flow", () => {
    const decision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);
    const optimization = optimizeClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);

    expect(decision.baselineSimulation).toEqual(
      simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG),
    );
    expect(decision.optimizedSimulation).toEqual(
      optimization.optimizedSimulation,
    );
    expect(decision.impactReport).toEqual(
      compareSimulationResults(
        decision.baselineSimulation,
        decision.optimizedSimulation,
      ),
    );
    expect(decision.metadata).toMatchObject({
      pipelineVersion: DECISION_PIPELINE_VERSION,
      impactDirection: "improvement",
      optimizerSearchSpaceSize: 455,
      changedParameterCount: 3,
      recommendationCount: 3,
      optimizedConfiguration: optimization.optimizedConfiguration,
    });
  });

  it("returns an optimized result that improves the default baseline", () => {
    const decision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);

    expect(decision.optimizedSimulation.dailyEnergyKWh).toBeLessThan(
      decision.baselineSimulation.dailyEnergyKWh,
    );
    expect(decision.impactReport.direction).toBe("improvement");
    expect(decision.impactReport.energyKWh.annual.difference).toBeLessThan(0);
    expect(decision.impactReport.co2Kg.annual.difference).toBeLessThan(0);
    expect(decision.impactReport.cost.annual.difference).toBeLessThan(0);
  });

  it("generates parameter-specific recommendations from component impacts", () => {
    const decision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);

    expect(decision.recommendations.map(({ id }) => id)).toEqual([
      "adjust-thermostatTemperatureC",
      "adjust-lightingLevelPercent",
      "adjust-devicePowerW",
    ]);
    expect(decision.recommendations[0]).toMatchObject({
      action: "Raise the thermostat from 24 °C to 26 °C.",
      parameterChange: {
        parameter: "thermostatTemperatureC",
        before: 24,
        after: 26,
      },
      evidence: {
        component: "hvac",
      },
    });
    expect(decision.recommendations[1].action).toBe(
      "Reduce the lighting level from 80% to 60%.",
    );
    expect(decision.recommendations[2].action).toBe(
      "Reduce the device power allowance from 1800 W to 1200 W.",
    );

    for (const recommendation of decision.recommendations) {
      expect(recommendation.explanation).toContain("per year in the model");
      expect(recommendation.evidence.componentDailyEnergyChangeKWh).toBeLessThan(
        0,
      );
      expect(
        recommendation.evidence.componentContributionPercent,
      ).toBeGreaterThan(0);
      expect(recommendation.evidence.annualEnergyChangeKWh).toBe(
        decision.impactReport.energyKWh.annual.difference,
      );
    }
  });

  it("returns exactly the same package for repeated runs", () => {
    const config: ClassroomConfig = {
      ...DEFAULT_CLASSROOM_CONFIG,
      outsideTemperatureC: 29,
      thermostatTemperatureC: 23.5,
      lightingLevelPercent: 75,
      devicePowerW: 1_725,
    };

    expect(runDecisionPipeline(config)).toEqual(runDecisionPipeline(config));
  });

  it("handles a zero-energy classroom with a maintain recommendation", () => {
    const config: ClassroomConfig = {
      ...DEFAULT_CLASSROOM_CONFIG,
      operatingHoursPerDay: 0,
      hvacEnabled: false,
      lightsEnabled: false,
      devicesEnabled: false,
    };
    const decision = runDecisionPipeline(config);

    expect(decision.baselineSimulation.dailyEnergyKWh).toBe(0);
    expect(decision.optimizedSimulation.dailyEnergyKWh).toBe(0);
    expect(decision.impactReport.direction).toBe("neutral");
    expect(decision.recommendations).toEqual([
      expect.objectContaining({
        id: "maintain-current-controls",
        priority: "none",
        parameterChange: null,
        evidence: expect.objectContaining({
          component: null,
          annualEnergyChangeKWh: 0,
        }),
      }),
    ]);
    expect(decision.recommendations[0].explanation).toContain(
      "no modeled energy, emissions, or cost change",
    );
  });

  it("does not mutate the input configuration", () => {
    const config: ClassroomConfig = { ...DEFAULT_CLASSROOM_CONFIG };
    const snapshot = structuredClone(config);

    const decision = runDecisionPipeline(config);

    expect(config).toEqual(snapshot);
    expect(decision.metadata.baselineConfiguration).not.toBe(config);
    expect(decision.metadata.baselineConfiguration).toEqual(snapshot);
  });

  it("passes custom optimizer constraints through the orchestration layer", () => {
    const lockedConstraints: OptimizerConstraints = {
      thermostatTemperatureC: { minimum: 24, maximum: 24, step: 1 },
      lightingLevelPercent: { minimum: 80, maximum: 80, step: 10 },
      devicePowerW: {
        minimumPerOccupant: 60,
        maximumPerOccupant: 60,
        stepPerOccupant: 5,
      },
    };
    const decision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG, {
      optimizerConstraints: lockedConstraints,
    });

    expect(decision.metadata.optimizerSearchSpaceSize).toBe(1);
    expect(decision.metadata.optimizedConfiguration).toEqual(
      DEFAULT_CLASSROOM_CONFIG,
    );
    expect(decision.impactReport.direction).toBe("neutral");
    expect(decision.recommendations[0].id).toBe("maintain-current-controls");
  });
});

describe("runTwinDecisionPipeline", () => {
  it("returns exactly the same package for repeated runs of one snapshot", () => {
    const twin = createEquivalentTwin();

    expect(runTwinDecisionPipeline(twin)).toEqual(
      runTwinDecisionPipeline(twin),
    );
  });

  it("matches the config pipeline for equivalent simulation inputs", () => {
    const twin = createEquivalentTwin();
    const configuration = twinSnapshotToClassroomConfig(twin);
    const configDecision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);
    const twinDecision = runTwinDecisionPipeline(twin);
    const { twin: twinContext, ...legacyMetadata } = twinDecision.metadata;

    expect(configuration).toEqual(DEFAULT_CLASSROOM_CONFIG);
    expect(twinContext).toBeDefined();
    expect({ ...twinDecision, metadata: legacyMetadata }).toEqual(
      configDecision,
    );
  });

  it("does not mutate or retain mutable references to the snapshot", () => {
    const twin = createEquivalentTwin();
    const original = structuredClone(twin);
    const decision = runTwinDecisionPipeline(twin);

    expect(twin).toEqual(original);
    expect(decision.metadata.twin?.definition).not.toBe(twin.definition);
    expect(decision.metadata.twin?.context).not.toBe(twin.context);
    expect(decision.metadata.twin?.snapshotMetadata).not.toBe(twin.metadata);
    expect(decision.metadata.twin?.snapshotMetadata.provenance).not.toBe(
      twin.metadata.provenance,
    );
  });

  it("preserves weather-derived context and snapshot provenance", () => {
    const twin = createEquivalentTwin();
    const decision = runTwinDecisionPipeline(twin);

    expect(decision.metadata.baselineConfiguration.outsideTemperatureC).toBe(
      twin.context.outsideTemperatureC,
    );
    expect(decision.metadata.twin).toEqual({
      definition: twin.definition,
      context: twin.context,
      snapshotMetadata: twin.metadata,
    });
  });
});
