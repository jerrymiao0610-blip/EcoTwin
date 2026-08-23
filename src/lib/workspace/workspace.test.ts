import { describe, expect, it } from "vitest";
import {
  runDecisionPipeline,
  runTwinDecisionPipeline,
} from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import { createTwinSnapshot } from "../twin/twin";
import type { TwinSnapshot } from "../twin/types";
import {
  buildWorkspace,
  MISSING_TWIN_METADATA_WARNING,
} from "./buildWorkspace";

function createTwin(): TwinSnapshot {
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
      operatingDaysPerMonth:
        DEFAULT_CLASSROOM_CONFIG.operatingDaysPerMonth,
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

describe("buildWorkspace", () => {
  it("generates a presentation model from a twin decision", () => {
    const twin = createTwin();
    const decision = runTwinDecisionPipeline(twin);
    const workspace = buildWorkspace(decision);

    expect(workspace.classroom).toEqual({
      id: "classroom-101",
      name: "Science Classroom 101",
      roomAreaM2: DEFAULT_CLASSROOM_CONFIG.roomAreaM2,
      lightingPowerDensityWPerM2:
        DEFAULT_CLASSROOM_CONFIG.lightingPowerDensityWPerM2,
    });
    expect(workspace.context).toEqual(twin.context);
    expect(workspace.baseline).toMatchObject({
      configuration: decision.metadata.baselineConfiguration,
      energyKWh: {
        daily: decision.baselineSimulation.dailyEnergyKWh,
        monthly: decision.baselineSimulation.monthlyEnergyKWh,
        annual: decision.baselineSimulation.annualEnergyKWh,
      },
      ecoScore: decision.baselineSimulation.ecoScore,
    });
    expect(workspace.optimized).toMatchObject({
      configuration: decision.metadata.optimizedConfiguration,
      energyKWh: {
        daily: decision.optimizedSimulation.dailyEnergyKWh,
        monthly: decision.optimizedSimulation.monthlyEnergyKWh,
        annual: decision.optimizedSimulation.annualEnergyKWh,
      },
      ecoScore: decision.optimizedSimulation.ecoScore,
    });
    expect(workspace.evidence.snapshotMetadata).toEqual(twin.metadata);
    expect(workspace.warnings).toEqual([]);
  });

  it("maps every recommendation and its evidence without inventing content", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const workspace = buildWorkspace(decision);

    expect(workspace.recommendations).toEqual(decision.recommendations);
    expect(workspace.recommendations).not.toBe(decision.recommendations);

    for (const [index, card] of workspace.recommendations.entries()) {
      const source = decision.recommendations[index];
      expect(card.id).toBe(source.id);
      expect(card.parameterChange).toEqual(source.parameterChange);
      expect(card.evidence).toEqual(source.evidence);
      expect(card.evidence).not.toBe(source.evidence);
    }
  });

  it("maps the complete impact report into detached presentation data", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const workspace = buildWorkspace(decision);

    expect(workspace.impact).toEqual(decision.impactReport);
    expect(workspace.impact).not.toBe(decision.impactReport);
    expect(workspace.impact.energyKWh).not.toBe(
      decision.impactReport.energyKWh,
    );
    expect(workspace.impact.components).not.toBe(
      decision.impactReport.components,
    );
    expect(workspace.impact.majorContributors).not.toBe(
      decision.impactReport.majorContributors,
    );
  });

  it("falls back safely and warns when twin metadata is missing", () => {
    const decision = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);
    const workspace = buildWorkspace(decision);

    expect(workspace.classroom).toEqual({
      id: null,
      name: null,
      roomAreaM2: DEFAULT_CLASSROOM_CONFIG.roomAreaM2,
      lightingPowerDensityWPerM2:
        DEFAULT_CLASSROOM_CONFIG.lightingPowerDensityWPerM2,
    });
    expect(workspace.context).toMatchObject({
      occupants: DEFAULT_CLASSROOM_CONFIG.occupants,
      outsideTemperatureC: DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC,
    });
    expect(workspace.evidence.snapshotMetadata).toBeNull();
    expect(workspace.warnings).toEqual([MISSING_TWIN_METADATA_WARNING]);
  });

  it("returns identical output for repeated builds and retains no mutable references", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const first = buildWorkspace(decision);
    const second = buildWorkspace(decision);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.baseline.configuration).not.toBe(
      decision.metadata.baselineConfiguration,
    );
    expect(first.optimized.configuration).not.toBe(
      decision.metadata.optimizedConfiguration,
    );
    expect(first.evidence.snapshotMetadata).not.toBe(
      decision.metadata.twin?.snapshotMetadata,
    );
    expect(first.evidence.snapshotMetadata?.provenance).not.toBe(
      decision.metadata.twin?.snapshotMetadata.provenance,
    );
  });
});
