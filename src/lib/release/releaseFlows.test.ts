import { describe, expect, it } from "vitest";
import { runDecisionPipeline } from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import { normalizeClassroomConfigEdit } from "../validation/classroomConfig";
import { buildScenarioResponse } from "../workspace/buildScenarioResponse";
import { buildScenarioWorkspaceModels } from "../workspace/buildScenarioWorkspace";
import { buildWorkspace } from "../workspace/buildWorkspace";

describe("Phase 11 release user-flow integration", () => {
  it("builds the default Current decision and all period metrics", () => {
    const workspace = buildWorkspace(
      runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
    );

    expect(workspace.baseline.configuration).toEqual(DEFAULT_CLASSROOM_CONFIG);
    expect(workspace.baseline.energyKWh.daily).toBeGreaterThan(0);
    expect(workspace.baseline.energyKWh.monthly).toBe(
      workspace.baseline.energyKWh.daily *
        DEFAULT_CLASSROOM_CONFIG.operatingDaysPerMonth,
    );
    expect(workspace.baseline.energyKWh.annual).toBe(
      workspace.baseline.energyKWh.daily *
        DEFAULT_CLASSROOM_CONFIG.operatingDaysPerYear,
    );
  });

  it("updates thermostat, lighting, and devices through the normalized boundary", () => {
    const thermostat = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "thermostatTemperatureC",
      26,
    );
    const lighting = normalizeClassroomConfigEdit(
      thermostat,
      "lightingLevelPercent",
      60,
    );
    const devices = normalizeClassroomConfigEdit(
      lighting,
      "devicePowerW",
      1_200,
    );
    const before = runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG);
    const after = runDecisionPipeline(devices);

    expect(after.baselineSimulation.hvacEnergyKWh).not.toBe(
      before.baselineSimulation.hvacEnergyKWh,
    );
    expect(after.baselineSimulation.lightingEnergyKWh).toBeLessThan(
      before.baselineSimulation.lightingEnergyKWh,
    );
    expect(after.baselineSimulation.deviceEnergyKWh).toBeLessThan(
      before.baselineSimulation.deviceEnergyKWh,
    );
  });

  it("keeps Heatwave, Empty Classroom, and Eco Mode semantics intact", () => {
    const models = buildScenarioWorkspaceModels(DEFAULT_CLASSROOM_CONFIG);
    const heatwave = models.find((model) => model.id === "heatwave-tomorrow")!;
    const empty = models.find((model) => model.id === "empty-classroom")!;
    const eco = models.find((model) => model.id === "eco-mode")!;

    expect(heatwave.scenario.configuration.outsideTemperatureC).toBe(
      DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC + 5,
    );
    expect(buildScenarioResponse(heatwave).recommendations.length).toBeGreaterThan(0);
    expect(empty.scenario.configuration.occupants).toBe(0);
    expect(empty.scenario.dailyEnergyByComponent.hvacKWh).toBeGreaterThan(0);
    expect(buildScenarioResponse(eco).status).toBe("already-at-modeled-plan");
  });

  it("restores an exact detached default checkpoint after edits", () => {
    const edited = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "devicePowerW",
      3_500,
    );
    const reset = { ...DEFAULT_CLASSROOM_CONFIG };

    expect(edited).not.toEqual(DEFAULT_CLASSROOM_CONFIG);
    expect(reset).toEqual(DEFAULT_CLASSROOM_CONFIG);
    expect(reset).not.toBe(DEFAULT_CLASSROOM_CONFIG);
  });
});
