import {
  DEFAULT_CLASSROOM_CONFIG,
  type ClassroomConfig,
} from "../simulation";

export type SpaceTypeId = "classroom" | "office" | "gymnasium";

export interface SpacePreset {
  id: SpaceTypeId;
  label: string;
  description: string;
  config: Readonly<ClassroomConfig>;
}

/**
 * Typical, illustrative operating profiles. They reuse the same deterministic
 * engine as the classroom demo; the preset only changes the default inputs.
 * Values are educational placeholders, not measurements of a real space.
 */
const SHARED_CONTEXT = {
  outsideTemperatureC: 32,
  operatingDaysPerMonth: 22,
  operatingDaysPerYear: 250,
  electricityPricePerKWh: 0.15,
  carbonIntensityKgPerKWh: 0.45,
  hvacEnabled: true,
  lightsEnabled: true,
  devicesEnabled: true,
} as const;

export const SPACE_PRESETS: Readonly<Record<SpaceTypeId, SpacePreset>> = {
  classroom: {
    id: "classroom",
    label: "Classroom",
    description: "60 m² · 30 people · 8 h/day",
    config: { ...DEFAULT_CLASSROOM_CONFIG },
  },
  office: {
    id: "office",
    label: "Open office",
    description: "160 m² · 24 desks · 10 h/day",
    config: {
      roomAreaM2: 160,
      occupants: 24,
      thermostatTemperatureC: 24,
      operatingHoursPerDay: 10,
      lightingLevelPercent: 80,
      lightingPowerDensityWPerM2: 9,
      devicePowerW: 1_920,
      ...SHARED_CONTEXT,
    },
  },
  gymnasium: {
    id: "gymnasium",
    label: "Gymnasium",
    description: "240 m² · 20 people · 12 h/day",
    config: {
      roomAreaM2: 240,
      occupants: 20,
      thermostatTemperatureC: 26,
      operatingHoursPerDay: 12,
      lightingLevelPercent: 100,
      lightingPowerDensityWPerM2: 10,
      devicePowerW: 600,
      ...SHARED_CONTEXT,
    },
  },
};

export const SPACE_PRESET_IDS: readonly SpaceTypeId[] = [
  "classroom",
  "office",
  "gymnasium",
];

export function getSpacePreset(id: SpaceTypeId): SpacePreset {
  return SPACE_PRESETS[id];
}
