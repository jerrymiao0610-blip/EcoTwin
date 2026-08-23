import { describe, expect, it } from "vitest";
import {
  createTwinSnapshot,
  TWIN_HASH_ALGORITHM,
  TWIN_SCHEMA_VERSION,
} from "./twin";
import type { CreateTwinSnapshotInput } from "./types";

type MutableTwinInput = {
  -readonly [Key in keyof CreateTwinSnapshotInput]: CreateTwinSnapshotInput[Key];
};

function createInput(): MutableTwinInput {
  return {
    definition: {
      id: "classroom-101",
      name: "Science Classroom 101",
      physicalProperties: {
        roomAreaM2: 60,
        lightingPowerDensityWPerM2: 8,
      },
    },
    state: {
      thermostatTemperatureC: 24,
      lightingLevelPercent: 80,
      devicePowerW: 1_800,
      hvacEnabled: true,
      lightsEnabled: true,
      devicesEnabled: true,
    },
    context: {
      occupants: 30,
      outsideTemperatureC: 32,
      operatingHoursPerDay: 8,
      operatingDaysPerMonth: 22,
      operatingDaysPerYear: 250,
      electricityPricePerKWh: 0.15,
      carbonIntensityKgPerKWh: 0.45,
    },
    capturedAt: "2026-08-23T10:30:00.000Z",
    provenance: {
      source: "classroom-config",
      sourceVersion: "phase-6",
    },
  };
}

describe("createTwinSnapshot", () => {
  it("creates a versioned snapshot with each concern kept separate", () => {
    const snapshot = createTwinSnapshot(createInput());

    expect(snapshot.definition).toEqual(createInput().definition);
    expect(snapshot.state).toEqual(createInput().state);
    expect(snapshot.context).toEqual(createInput().context);
    expect(snapshot.metadata).toEqual({
      schemaVersion: TWIN_SCHEMA_VERSION,
      capturedAt: "2026-08-23T10:30:00.000Z",
      provenance: {
        source: "classroom-config",
        sourceVersion: "phase-6",
      },
      contentHash: expect.stringMatching(
        new RegExp(`^${TWIN_HASH_ALGORITHM}:[0-9a-f]{8}$`),
      ),
    });
  });

  it("returns detached and deeply frozen output without mutating input", () => {
    const input = createInput();
    const original = structuredClone(input);
    const snapshot = createTwinSnapshot(input);

    expect(input).toEqual(original);
    expect(snapshot.definition).not.toBe(input.definition);
    expect(snapshot.definition.physicalProperties).not.toBe(
      input.definition.physicalProperties,
    );
    expect(snapshot.state).not.toBe(input.state);
    expect(snapshot.context).not.toBe(input.context);
    expect(snapshot.metadata.provenance).not.toBe(input.provenance);

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.definition)).toBe(true);
    expect(Object.isFrozen(snapshot.definition.physicalProperties)).toBe(true);
    expect(Object.isFrozen(snapshot.state)).toBe(true);
    expect(Object.isFrozen(snapshot.context)).toBe(true);
    expect(Object.isFrozen(snapshot.metadata)).toBe(true);
    expect(Object.isFrozen(snapshot.metadata.provenance)).toBe(true);
  });

  it("produces the same content hash for equivalent classroom content", () => {
    const first = createTwinSnapshot(createInput());
    const secondInput = createInput();
    secondInput.capturedAt = "2026-08-23T11:30:00.000Z";
    secondInput.provenance = { source: "imported-file" };
    const second = createTwinSnapshot(secondInput);

    expect(second.metadata.contentHash).toBe(first.metadata.contentHash);
    expect(second.metadata.capturedAt).not.toBe(first.metadata.capturedAt);
    expect(second.metadata.provenance).not.toEqual(first.metadata.provenance);
  });

  it("changes the content hash when twin content changes", () => {
    const baseline = createTwinSnapshot(createInput());
    const changedInput = createInput();
    changedInput.state = {
      ...changedInput.state,
      thermostatTemperatureC: 25,
    };
    const changed = createTwinSnapshot(changedInput);

    expect(changed.metadata.contentHash).not.toBe(
      baseline.metadata.contentHash,
    );
  });

  it("hashes Unicode definition data deterministically", () => {
    const input = createInput();
    input.definition = { ...input.definition, name: "科学教室" };

    expect(createTwinSnapshot(input).metadata.contentHash).toBe(
      createTwinSnapshot(structuredClone(input)).metadata.contentHash,
    );
  });

  it.each([
    ["definition id", (input: MutableTwinInput) => {
      input.definition = { ...input.definition, id: " " };
    }, "Twin definition id must be a non-empty string."],
    ["room area", (input: MutableTwinInput) => {
      input.definition = {
        ...input.definition,
        physicalProperties: {
          ...input.definition.physicalProperties,
          roomAreaM2: 0,
        },
      };
    }, "Room area must be greater than zero."],
    ["lighting level", (input: MutableTwinInput) => {
      input.state = { ...input.state, lightingLevelPercent: 101 };
    }, "Lighting level must be between 0 and 100."],
    ["occupants", (input: MutableTwinInput) => {
      input.context = { ...input.context, occupants: 2.5 };
    }, "Occupants must be an integer."],
    ["operating days", (input: MutableTwinInput) => {
      input.context = { ...input.context, operatingDaysPerMonth: 32 };
    }, "Operating days per month must be between 0 and 31."],
    ["captured time", (input: MutableTwinInput) => {
      input.capturedAt = "not-a-date";
    }, "Captured time must be valid ISO 8601."],
    ["provenance", (input: MutableTwinInput) => {
      input.provenance = { source: "" };
    }, "Provenance source must be a non-empty string."],
  ])("rejects invalid %s data", (_label, mutate, message) => {
    const input = createInput();
    mutate(input);

    expect(() => createTwinSnapshot(input)).toThrow(message);
  });
});
