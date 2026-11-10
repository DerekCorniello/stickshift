// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { defaultBindings, leftDialConfig, rightDialConfig } from "../typing";
import { loadSavedConfig } from "./savedConfig";

afterEach(() => localStorage.clear());

function previousBindings() {
  const bindings: Record<string, number | null> = { ...defaultBindings };
  delete bindings.acceptFirstSuggestion;
  return bindings;
}

it("keeps an existing layout when adding the new suggestion binding", () => {
  const layout = { left: leftDialConfig, right: rightDialConfig };
  localStorage.setItem(
    "stickshift.config.v1",
    JSON.stringify({ layout, bindings: previousBindings() }),
  );
  expect(loadSavedConfig()).toEqual({ layout, bindings: defaultBindings });
});

it("shares Enter with the first suggestion when older settings have another action on button 1", () => {
  const layout = { left: leftDialConfig, right: rightDialConfig };
  localStorage.setItem(
    "stickshift.config.v1",
    JSON.stringify({ layout, bindings: { ...previousBindings(), space: 1 } }),
  );
  expect(loadSavedConfig()?.bindings.acceptFirstSuggestion).toBe(0);
});

it("follows an older custom Enter binding when adding the first-suggestion action", () => {
  const layout = { left: leftDialConfig, right: rightDialConfig };
  localStorage.setItem(
    "stickshift.config.v1",
    JSON.stringify({
      layout,
      bindings: { ...previousBindings(), enter: 17 },
    }),
  );
  expect(loadSavedConfig()?.bindings.acceptFirstSuggestion).toBe(17);
});
