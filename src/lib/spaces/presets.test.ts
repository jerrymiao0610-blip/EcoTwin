import { describe, expect, it } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import {
  assertValidClassroomConfig,
  parseClassroomConfigInput,
} from "../validation/classroomConfig";
import {
  SPACE_PRESETS,
  SPACE_PRESET_IDS,
  getSpacePreset,
} from "./presets";

describe("space presets", () => {
  it("declares a unique preset for each id in stable order", () => {
    expect(SPACE_PRESET_IDS).toEqual(["classroom", "office", "gymnasium"]);
    expect(new Set(SPACE_PRESET_IDS).size).toBe(SPACE_PRESET_IDS.length);
    for (const id of SPACE_PRESET_IDS) {
      expect(SPACE_PRESETS[id].id).toBe(id);
      expect(getSpacePreset(id)).toBe(SPACE_PRESETS[id]);
    }
  });

  it("keeps every preset within the dashboard input rules", () => {
    for (const preset of Object.values(SPACE_PRESETS)) {
      expect(() => assertValidClassroomConfig(preset.config)).not.toThrow();
      expect(() => parseClassroomConfigInput(preset.config)).not.toThrow();
    }
  });

  it("uses the established classroom default for the classroom preset", () => {
    expect(SPACE_PRESETS.classroom.config).toEqual(DEFAULT_CLASSROOM_CONFIG);
  });
});
