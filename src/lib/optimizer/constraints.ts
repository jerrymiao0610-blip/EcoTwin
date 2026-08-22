import type { ClassroomConfig } from "../simulation";
import type {
  NumericGridConstraint,
  OptimizerConstraints,
  OptimizerSearchSpace,
  PerOccupantGridConstraint,
} from "./types";

/**
 * Phase 1 usability policy:
 * - 20–26 °C keeps the thermostat in a broadly usable classroom range.
 * - At least 60% lighting retains useful illumination.
 * - 40 W per occupant retains an efficient personal-device allowance.
 *
 * These are transparent product constraints, not building-code requirements.
 */
export const DEFAULT_OPTIMIZER_CONSTRAINTS: Readonly<OptimizerConstraints> = {
  thermostatTemperatureC: { minimum: 20, maximum: 26, step: 1 },
  lightingLevelPercent: { minimum: 60, maximum: 100, step: 10 },
  devicePowerW: {
    minimumPerOccupant: 40,
    maximumPerOccupant: 100,
    stepPerOccupant: 5,
  },
};

const PRECISION = 10;

function round(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be a finite number.`);
  }
}

function validateGrid(
  constraint: NumericGridConstraint,
  label: string,
): void {
  assertFinite(constraint.minimum, `${label}.minimum`);
  assertFinite(constraint.maximum, `${label}.maximum`);
  assertFinite(constraint.step, `${label}.step`);

  if (constraint.minimum > constraint.maximum) {
    throw new RangeError(`${label}.minimum must not exceed its maximum.`);
  }
  if (constraint.step <= 0) {
    throw new RangeError(`${label}.step must be greater than zero.`);
  }
}

function validatePerOccupantGrid(
  constraint: PerOccupantGridConstraint,
): void {
  validateGrid(
    {
      minimum: constraint.minimumPerOccupant,
      maximum: constraint.maximumPerOccupant,
      step: constraint.stepPerOccupant,
    },
    "devicePowerW",
  );
}

function createGrid(constraint: NumericGridConstraint): number[] {
  const values: number[] = [];

  for (
    let value = constraint.minimum;
    value <= constraint.maximum + Number.EPSILON;
    value += constraint.step
  ) {
    values.push(round(Math.min(value, constraint.maximum)));
  }

  if (values.at(-1) !== constraint.maximum) {
    values.push(constraint.maximum);
  }

  return values;
}

function includeFeasibleBaseline(
  values: number[],
  baseline: number,
  constraint: NumericGridConstraint,
): number[] {
  if (baseline >= constraint.minimum && baseline <= constraint.maximum) {
    values.push(round(baseline));
  }

  return [...new Set(values)].sort((left, right) => left - right);
}

export function createOptimizerSearchSpace(
  config: ClassroomConfig,
  constraints: OptimizerConstraints = DEFAULT_OPTIMIZER_CONSTRAINTS,
): OptimizerSearchSpace {
  assertFinite(config.thermostatTemperatureC, "thermostatTemperatureC");
  assertFinite(config.lightingLevelPercent, "lightingLevelPercent");
  assertFinite(config.devicePowerW, "devicePowerW");
  assertFinite(config.occupants, "occupants");
  validateGrid(
    constraints.thermostatTemperatureC,
    "thermostatTemperatureC",
  );
  validateGrid(constraints.lightingLevelPercent, "lightingLevelPercent");
  validatePerOccupantGrid(constraints.devicePowerW);

  const thermostatTemperatureC = config.hvacEnabled
    ? includeFeasibleBaseline(
        createGrid(constraints.thermostatTemperatureC),
        config.thermostatTemperatureC,
        constraints.thermostatTemperatureC,
      )
    : [config.thermostatTemperatureC];

  const lightingLevelPercent = config.lightsEnabled
    ? includeFeasibleBaseline(
        createGrid(constraints.lightingLevelPercent),
        config.lightingLevelPercent,
        constraints.lightingLevelPercent,
      )
    : [config.lightingLevelPercent];

  const occupants = Math.max(0, config.occupants);
  const deviceConstraint: NumericGridConstraint = {
    minimum: constraints.devicePowerW.minimumPerOccupant * occupants,
    maximum: constraints.devicePowerW.maximumPerOccupant * occupants,
    step: Math.max(1, constraints.devicePowerW.stepPerOccupant * occupants),
  };
  const devicePowerW = config.devicesEnabled
    ? includeFeasibleBaseline(
        createGrid(deviceConstraint),
        config.devicePowerW,
        deviceConstraint,
      )
    : [config.devicePowerW];

  return {
    thermostatTemperatureC,
    lightingLevelPercent,
    devicePowerW,
  };
}
