import type { DialConfig, LayerConfig, SliceConfig } from "../typing";

export type Layout = Readonly<{ left: DialConfig; right: DialConfig }>;
export type DialSide = keyof Layout;

export function nextConfigId(
  existing: readonly string[],
  prefix: string,
): string {
  let number = 1;
  while (existing.includes(`${prefix}-${number}`)) number += 1;
  return `${prefix}-${number}`;
}

export function changeLayerOrder(
  layout: Layout,
  from: number,
  to: number,
): Layout {
  if (
    from < 0 ||
    from >= layout.left.layers.length ||
    to < 0 ||
    to >= layout.left.layers.length ||
    from === to
  )
    return layout;
  const move = (layers: readonly LayerConfig[]) => {
    const next = [...layers];
    next.splice(to, 0, ...next.splice(from, 1));
    return next;
  };
  return {
    left: { ...layout.left, layers: move(layout.left.layers) },
    right: { ...layout.right, layers: move(layout.right.layers) },
  };
}

export function addLayer(layout: Layout, id: string): Layout {
  const add = (dial: DialConfig): DialConfig => ({
    ...dial,
    layers: [
      ...dial.layers,
      { id, slices: [{ id: `${id}-${dial.id}-1`, character: "" }] },
    ],
  });
  return { left: add(layout.left), right: add(layout.right) };
}

export function removeLayer(layout: Layout, id: string): Layout {
  const remove = (dial: DialConfig): DialConfig => ({
    ...dial,
    layers: dial.layers.filter((layer) => layer.id !== id),
  });
  return { left: remove(layout.left), right: remove(layout.right) };
}

export function updateSlices(
  layout: Layout,
  side: DialSide,
  layerId: string,
  update: (slices: readonly SliceConfig[]) => readonly SliceConfig[],
): Layout {
  return {
    ...layout,
    [side]: {
      ...layout[side],
      layers: layout[side].layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, slices: update(layer.slices) }
          : layer,
      ),
    },
  };
}

export function moveSlice(
  slices: readonly SliceConfig[],
  from: number,
  to: number,
) {
  if (
    from === to ||
    from < 0 ||
    from >= slices.length ||
    to < 0 ||
    to >= slices.length
  )
    return slices;
  const next = [...slices];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function duplicateSliceIds(layout: Layout): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const side of ["left", "right"] as const) {
    for (const layer of layout[side].layers) {
      for (const slice of layer.slices) {
        if (slice.character.length === 1) {
          counts.set(slice.character, (counts.get(slice.character) ?? 0) + 1);
        }
      }
    }
  }
  const duplicates = new Set(
    [...counts]
      .filter(([, count]) => count > 1)
      .map(([character]) => character),
  );
  const ids = new Set<string>();
  for (const side of ["left", "right"] as const) {
    for (const layer of layout[side].layers) {
      for (const slice of layer.slices) {
        if (duplicates.has(slice.character)) ids.add(slice.id);
      }
    }
  }
  return ids;
}

const printable = Array.from({ length: 94 }, (_, index) =>
  String.fromCharCode(index + 33),
);

export function layoutWarnings(layout: Layout): readonly string[] {
  const warnings: string[] = [];
  const counts = new Map<string, number>();
  for (const side of ["left", "right"] as const) {
    for (const layer of layout[side].layers) {
      if (layer.slices.length <= 7)
        warnings.push(
          `${side} ${layer.id}: 7 or fewer slices can create too many layers.`,
        );
      if (layer.slices.length > 16)
        warnings.push(
          `${side} ${layer.id}: more than 16 slices can be inaccurate.`,
        );
      for (const [sliceIndex, slice] of layer.slices.entries()) {
        if (slice.character.length !== 1) {
          warnings.push(
            `${side} dial, layer "${layer.id}", slice ${sliceIndex + 1} is unassigned.`,
          );
        } else {
          counts.set(slice.character, (counts.get(slice.character) ?? 0) + 1);
        }
      }
    }
  }
  const duplicates = [...counts].filter(([, count]) => count > 1);
  const missing = printable.filter((character) => !counts.has(character));
  if (duplicates.length)
    warnings.push(
      ...duplicates.map(
        ([character, count]) =>
          `Character ${JSON.stringify(character)} is assigned ${count} times.`,
      ),
    );
  if (missing.length)
    warnings.push(
      `Missing characters: ${missing.map((character) => JSON.stringify(character)).join(", ")}`,
    );
  return warnings;
}
