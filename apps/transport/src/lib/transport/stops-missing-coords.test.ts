import { describe, expect, it } from "vitest";
import { listStopsMissingCoords } from "./stops-missing-coords";

describe("listStopsMissingCoords", () => {
  it("returns waypoint stops without finite lat/lng", () => {
    const missing = listStopsMissingCoords([
      { id: "1", name: "Gate", latitude: 12.9, longitude: 77.5 },
      { id: "2", name: "Broken", latitude: Number.NaN, longitude: 77.5 },
      { id: "3", name: "Also", latitude: 12.9, longitude: undefined as unknown as number },
      { id: "4", name: "School", latitude: Number.NaN, longitude: Number.NaN, kind: "school" },
    ]);
    expect(missing.map((s) => s.id)).toEqual(["2", "3"]);
  });
});
