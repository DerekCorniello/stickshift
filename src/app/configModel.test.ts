import { describe, expect, it } from "vitest";
import { leftDialConfig, rightDialConfig } from "../typing/defaultLayout";
import {
  addLayer,
  changeLayerOrder,
  layoutWarnings,
  moveSlice,
  removeLayer,
  updateSlices,
} from "./configModel";
import type { Layout } from "./configModel";

const defaults: Layout = { left: leftDialConfig, right: rightDialConfig };

describe("controller configuration", () => {
  it("keeps layer IDs aligned when adding, moving, and deleting a layer", () => {
    const added = addLayer(defaults, "custom");
    const moved = changeLayerOrder(added, 4, 1);
    expect(moved.left.layers.map((layer) => layer.id)).toEqual(
      moved.right.layers.map((layer) => layer.id),
    );
    expect(moved.left.layers[1].id).toBe("custom");
    const removed = removeLayer(moved, "custom");
    expect(removed.left.layers.map((layer) => layer.id)).toEqual(
      defaults.left.layers.map((layer) => layer.id),
    );
  });

  it("permits incomplete and duplicate mappings while reporting them", () => {
    expect(layoutWarnings(defaults)).toEqual([]);
    const incomplete = addLayer(defaults, "custom");
    expect(layoutWarnings(incomplete).join(" ")).toContain(
      "slice 1 is unassigned",
    );
    const duplicate = updateSlices(defaults, "left", "lowercase", (slices) =>
      slices.map((slice, index) =>
        index === 0 ? { ...slice, character: "t" } : slice,
      ),
    );
    const warnings = layoutWarnings(duplicate).join(" ");
    expect(warnings).toContain('Character "t" is assigned 2 times.');
    expect(warnings).toContain('Missing characters: "e"');
  });

  it("reorders a selected slice without changing its stable ID", () => {
    const slices = defaults.left.layers[0].slices;
    const moved = moveSlice(slices, 0, 2);
    expect(moved[2].id).toBe(slices[0].id);
    expect(moved.map((slice) => slice.id)).toHaveLength(slices.length);
  });
});
