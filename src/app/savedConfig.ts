import { controlActions, defaultBindings } from "../typing/controllerEvents";
import type { ButtonBindings, DialConfig } from "../typing";
import type { Layout } from "./configModel";

export type SavedConfig = Readonly<{
  layout: Layout;
  bindings: ButtonBindings;
}>;
const storageKey = "stickshift.config.v1";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dial(value: unknown, side: "left" | "right"): value is DialConfig {
  return (
    record(value) &&
    value.id === side &&
    Array.isArray(value.layers) &&
    value.layers.length > 0 &&
    value.layers.every(
      (layer: unknown) =>
        record(layer) &&
        typeof layer.id === "string" &&
        Array.isArray(layer.slices) &&
        layer.slices.length > 0 &&
        layer.slices.every(
          (slice: unknown) =>
            record(slice) &&
            typeof slice.id === "string" &&
            typeof slice.character === "string" &&
            slice.character.length <= 1,
        ),
    )
  );
}

function savedConfig(value: unknown): value is SavedConfig {
  if (!record(value) || !record(value.layout) || !record(value.bindings))
    return false;
  if (!dial(value.layout.left, "left") || !dial(value.layout.right, "right"))
    return false;
  const leftIds = value.layout.left.layers.map((layer) => layer.id);
  const rightIds = value.layout.right.layers.map((layer) => layer.id);
  if (
    leftIds.length !== rightIds.length ||
    new Set(leftIds).size !== leftIds.length ||
    leftIds.some((id, index) => id !== rightIds[index])
  )
    return false;
  const bindings = value.bindings;
  return controlActions.every((action) => {
    const index = bindings[action];
    return (
      index === null ||
      (typeof index === "number" && Number.isInteger(index) && index >= 0)
    );
  });
}

export function loadSavedConfig(): SavedConfig | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!record(parsed) || !record(parsed.bindings)) return null;
    const bindings =
      parsed.bindings.acceptFirstSuggestion === undefined
        ? {
            ...parsed.bindings,
            acceptFirstSuggestion:
              parsed.bindings.enter === undefined
                ? defaultBindings.enter
                : parsed.bindings.enter,
          }
        : parsed.bindings;
    const config = { ...parsed, bindings };
    return savedConfig(config) ? config : null;
  } catch (error) {
    console.warn("Could not load controller config", error);
    return null;
  }
}

export function saveConfig(config: SavedConfig): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (error) {
    console.warn("Could not save controller config", error);
  }
}
