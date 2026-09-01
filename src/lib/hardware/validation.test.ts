import { describe, expect, it } from "vitest";
import { parseEdgeNodeSerialLine } from "./validation";

describe("EcoTwin Edge Node serial validation", () => {
  it("parses a valid protocol reading", () => {
    expect(parseEdgeNodeSerialLine(
      '{"type":"ecotwin-edge","temperatureC":29.8,"humidityPercent":68.0}',
    )).toEqual({
      kind: "reading",
      reading: { temperatureC: 29.8, humidityPercent: 68 },
    });
  });

  it("rejects malformed JSON without throwing", () => {
    expect(parseEdgeNodeSerialLine("{not-json")).toEqual({
      kind: "invalid",
      reason: "Malformed JSON.",
    });
  });

  it.each([
    ['{"type":"ecotwin-edge","humidityPercent":68}', "Temperature must be finite."],
    ['{"type":"ecotwin-edge","temperatureC":29.8}', "Humidity must be finite."],
    ['{"type":"ecotwin-edge","temperatureC":1e309,"humidityPercent":68}', "Temperature must be finite."],
    ['{"type":"ecotwin-edge","temperatureC":29.8,"humidityPercent":1e309}', "Humidity must be finite."],
  ])("rejects missing and non-finite fields", (line, reason) => {
    expect(parseEdgeNodeSerialLine(line)).toEqual({ kind: "invalid", reason });
  });

  it.each([-0.1, 100.1])("rejects invalid humidity %s", (humidityPercent) => {
    const result = parseEdgeNodeSerialLine(JSON.stringify({
      type: "ecotwin-edge",
      temperatureC: 29.8,
      humidityPercent,
    }));

    expect(result).toEqual({
      kind: "invalid",
      reason: "Humidity is outside presentation bounds.",
    });
  });

  it.each([-50.1, 100.1])("rejects invalid temperature %s", (temperatureC) => {
    const result = parseEdgeNodeSerialLine(JSON.stringify({
      type: "ecotwin-edge",
      temperatureC,
      humidityPercent: 68,
    }));

    expect(result).toEqual({
      kind: "invalid",
      reason: "Temperature is outside presentation bounds.",
    });
  });

  it("ignores unsupported message types", () => {
    expect(parseEdgeNodeSerialLine(
      '{"type":"generic-device","temperatureC":29.8,"humidityPercent":68}',
    )).toEqual({ kind: "ignored" });
  });
});
