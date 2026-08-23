import type { ClassroomConfig } from "../simulation";
import type { TwinSnapshot } from "../twin/types";
import type { TwinDecisionContext } from "./types";

/**
 * Normalizes a digital-twin snapshot into the simulator's established input
 * contract. Physics remains exclusively owned by simulateClassroomEnergy.
 */
export function twinSnapshotToClassroomConfig(
  twin: Readonly<TwinSnapshot>,
): ClassroomConfig {
  return {
    roomAreaM2: twin.definition.physicalProperties.roomAreaM2,
    occupants: twin.context.occupants,
    outsideTemperatureC: twin.context.outsideTemperatureC,
    thermostatTemperatureC: twin.state.thermostatTemperatureC,
    operatingHoursPerDay: twin.context.operatingHoursPerDay,
    operatingDaysPerMonth: twin.context.operatingDaysPerMonth,
    operatingDaysPerYear: twin.context.operatingDaysPerYear,
    lightingLevelPercent: twin.state.lightingLevelPercent,
    lightingPowerDensityWPerM2:
      twin.definition.physicalProperties.lightingPowerDensityWPerM2,
    devicePowerW: twin.state.devicePowerW,
    electricityPricePerKWh: twin.context.electricityPricePerKWh,
    carbonIntensityKgPerKWh: twin.context.carbonIntensityKgPerKWh,
    hvacEnabled: twin.state.hvacEnabled,
    lightsEnabled: twin.state.lightsEnabled,
    devicesEnabled: twin.state.devicesEnabled,
  };
}

/** Creates detached snapshot metadata for inclusion in a decision package. */
export function twinSnapshotToDecisionContext(
  twin: Readonly<TwinSnapshot>,
): TwinDecisionContext {
  return {
    definition: {
      id: twin.definition.id,
      name: twin.definition.name,
      physicalProperties: {
        roomAreaM2: twin.definition.physicalProperties.roomAreaM2,
        lightingPowerDensityWPerM2:
          twin.definition.physicalProperties.lightingPowerDensityWPerM2,
      },
    },
    context: {
      occupants: twin.context.occupants,
      outsideTemperatureC: twin.context.outsideTemperatureC,
      operatingHoursPerDay: twin.context.operatingHoursPerDay,
      operatingDaysPerMonth: twin.context.operatingDaysPerMonth,
      operatingDaysPerYear: twin.context.operatingDaysPerYear,
      electricityPricePerKWh: twin.context.electricityPricePerKWh,
      carbonIntensityKgPerKWh: twin.context.carbonIntensityKgPerKWh,
    },
    snapshotMetadata: {
      schemaVersion: twin.metadata.schemaVersion,
      capturedAt: twin.metadata.capturedAt,
      provenance: {
        source: twin.metadata.provenance.source,
        ...(twin.metadata.provenance.sourceVersion === undefined
          ? {}
          : { sourceVersion: twin.metadata.provenance.sourceVersion }),
      },
      contentHash: twin.metadata.contentHash,
    },
  };
}
