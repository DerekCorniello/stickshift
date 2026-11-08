// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dial } from "./Dial";
import { leftDialConfig, rightDialConfig } from "./defaultLayout";
import { highlightedSliceIndex, slicePath, stableSliceIndex } from "./geometry";
import type { DialConfig, StickPosition } from "./types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const printableAscii = Array.from({ length: 94 }, (_, index) =>
  String.fromCharCode(index + 33),
);

describe("default dial layout", () => {
  it("places every non-space printable ASCII character exactly once", () => {
    const characters = [leftDialConfig, rightDialConfig].flatMap((dial) =>
      dial.layers.flatMap((layer) =>
        layer.slices.map((slice) => slice.character),
      ),
    );

    expect(characters).toHaveLength(94);
    expect([...characters].sort()).toEqual(printableAscii);
    expect(new Set(characters).size).toBe(94);
  });

  it("uses matching layers and stable, unique slice IDs", () => {
    expect(leftDialConfig.layers.map((layer) => layer.id)).toEqual(
      rightDialConfig.layers.map((layer) => layer.id),
    );

    for (const dial of [leftDialConfig, rightDialConfig]) {
      expect(dial.layers.map((layer) => layer.slices.length)).toEqual([
        13, 13, 13, 8,
      ]);
      const ids = dial.layers.flatMap((layer) =>
        layer.slices.map((slice) => slice.id),
      );
      expect(new Set(ids).size).toBe(ids.length);
      for (const layer of dial.layers) {
        expect(
          layer.slices.every((slice) => [...slice.character].length === 1),
        ).toBe(true);
      }
    }
  });

  it("splits letters, digits, and punctuation across the expected layers", () => {
    expect(
      leftDialConfig.layers[0].slices.map((slice) => slice.character).join(""),
    ).toBe("ehaidupfgyvxs");
    expect(
      rightDialConfig.layers[0].slices.map((slice) => slice.character).join(""),
    ).toBe("tnolcmqwbkjzr");
    expect(
      leftDialConfig.layers[1].slices.map((slice) => slice.character).join(""),
    ).toBe("EHAIDUPFGYVXS");
    expect(
      rightDialConfig.layers[1].slices.map((slice) => slice.character).join(""),
    ).toBe("TNOLCMQWBKJZR");
    const topIndices = [11, 12, 0, 1, 2];
    expect(
      topIndices
        .map((index) => leftDialConfig.layers[2].slices[index].character)
        .join(""),
    ).toBe("01234");
    expect(
      topIndices
        .map((index) => rightDialConfig.layers[2].slices[index].character)
        .join(""),
    ).toBe("56789");

    const punctuation = printableAscii.filter(
      (character) => !/[A-Za-z0-9]/.test(character),
    );
    const placedPunctuation = [
      ...leftDialConfig.layers[2].slices.slice(3, 11),
      ...rightDialConfig.layers[2].slices.slice(3, 11),
      ...leftDialConfig.layers[3].slices,
      ...rightDialConfig.layers[3].slices,
    ].map((slice) => slice.character);
    expect(placedPunctuation).toEqual(punctuation);
  });

  it("keeps common letter connections near each other", () => {
    const left = leftDialConfig.layers[0].slices.map(
      (slice) => slice.character,
    );
    const right = rightDialConfig.layers[0].slices.map(
      (slice) => slice.character,
    );
    const distance = (first: number, second: number) => {
      const gap = Math.abs(first - second);
      return Math.min(gap, 13 - gap);
    };

    expect(distance(left.indexOf("e"), right.indexOf("t"))).toBe(0);
    expect(distance(right.indexOf("t"), left.indexOf("h"))).toBe(1);
    expect(distance(left.indexOf("e"), right.indexOf("r"))).toBe(1);
    expect(distance(left.indexOf("a"), right.indexOf("n"))).toBe(1);
    expect(distance(left.indexOf("u"), right.indexOf("q"))).toBe(1);
    expect(distance(left.indexOf("e"), left.indexOf("s"))).toBe(1);
  });
});

describe("slice geometry and highlighting", () => {
  it.each([8, 13])(
    "highlights the top and wraps around on a %i-slice layer",
    (count) => {
      expect(highlightedSliceIndex({ x: 0, y: -1 }, 0.2, count)).toBe(0);
      expect(highlightedSliceIndex({ x: -0.001, y: -1 }, 0.2, count)).toBe(0);
      expect(highlightedSliceIndex({ x: 0.001, y: -1 }, 0.2, count)).toBe(0);
      expect(highlightedSliceIndex({ x: 0, y: 0 }, 0.2, count)).toBeNull();
      expect(highlightedSliceIndex({ x: 0, y: -0.2 }, 0.2, count)).toBeNull();
    },
  );

  it.each([8, 13])(
    "selects adjacent slices across the boundary on a %i-slice layer",
    (count) => {
      const boundary = Math.PI / count;
      const position = (angle: number): StickPosition => ({
        x: Math.sin(angle),
        y: -Math.cos(angle),
      });

      expect(
        highlightedSliceIndex(position(boundary - 0.001), 0.2, count),
      ).toBe(0);
      expect(
        highlightedSliceIndex(position(boundary + 0.001), 0.2, count),
      ).toBe(1);
      expect(
        highlightedSliceIndex(position(-boundary - 0.001), 0.2, count),
      ).toBe(count - 1);
    },
  );

  it.each([8, 13])(
    "keeps the current selection through a small boundary wobble on a %i-slice layer",
    (count) => {
      const sweep = (2 * Math.PI) / count;
      const position = (angle: number): StickPosition => ({
        x: Math.sin(angle),
        y: -Math.cos(angle),
      });

      expect(stableSliceIndex(position(sweep * 0.58), 0.2, count, 0)).toBe(0);
      expect(stableSliceIndex(position(sweep * 0.66), 0.2, count, 0)).toBe(1);
      expect(stableSliceIndex(position(sweep * 0.42), 0.2, count, 1)).toBe(1);
      expect(stableSliceIndex(position(sweep * 0.34), 0.2, count, 1)).toBe(0);
    },
  );

  it("makes eight-slice wedges wider than thirteen-slice wedges", () => {
    expect(slicePath(0, 8)).not.toBe(slicePath(0, 13));
  });
});

describe("Dial", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderDial(
    config: DialConfig,
    activeLayerId: string,
    position: StickPosition,
    onHighlightChange: (character: string | null) => void,
  ) {
    act(() => {
      root.render(
        <Dial
          config={config}
          activeLayerId={activeLayerId}
          position={position}
          deadzone={0.2}
          onHighlightChange={onHighlightChange}
        />,
      );
    });
  }

  it("renders the active layer and reports highlights as the stick moves", () => {
    const onHighlightChange = vi.fn<(character: string | null) => void>();
    renderDial(leftDialConfig, "lowercase", { x: 0, y: 0 }, onHighlightChange);
    expect(container.querySelectorAll(".dial-slice")).toHaveLength(13);
    expect(container.querySelectorAll(".dial-slice--highlighted")).toHaveLength(
      0,
    );
    expect(onHighlightChange).toHaveBeenLastCalledWith(null);

    renderDial(leftDialConfig, "lowercase", { x: 0, y: -1 }, onHighlightChange);
    expect(
      container
        .querySelector(".dial-slice--highlighted")
        ?.getAttribute("data-character"),
    ).toBe("e");
    expect(onHighlightChange).toHaveBeenLastCalledWith("e");

    renderDial(leftDialConfig, "symbols", { x: 0, y: -1 }, onHighlightChange);
    expect(container.querySelectorAll(".dial-slice")).toHaveLength(8);
    expect(
      container.querySelector(".dial-layer")?.getAttribute("data-layer-id"),
    ).toBe("symbols");
    expect(onHighlightChange).toHaveBeenLastCalledWith(";");

    renderDial(leftDialConfig, "symbols", { x: 0, y: 0 }, onHighlightChange);
    expect(container.querySelectorAll(".dial-slice--highlighted")).toHaveLength(
      0,
    );
    expect(onHighlightChange).toHaveBeenLastCalledWith(null);
  });

  it("rerenders when a different dial config is passed", () => {
    const onHighlightChange = vi.fn<(character: string | null) => void>();
    renderDial(leftDialConfig, "lowercase", { x: 0, y: -1 }, onHighlightChange);
    renderDial(
      rightDialConfig,
      "lowercase",
      { x: 0, y: -1 },
      onHighlightChange,
    );

    expect(container.querySelector(".dial")?.getAttribute("data-dial-id")).toBe(
      "right",
    );
    expect(
      container
        .querySelector(".dial-slice--highlighted")
        ?.getAttribute("data-character"),
    ).toBe("t");
    expect(onHighlightChange).toHaveBeenLastCalledWith("t");
  });
});
