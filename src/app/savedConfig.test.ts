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

it("leaves the new action unassigned if button 1 is already in use", () => {
  const layout = { left: leftDialConfig, right: rightDialConfig };
  localStorage.setItem(
    "stickshift.config.v1",
    JSON.stringify({ layout, bindings: { ...previousBindings(), space: 1 } }),
  );
  expect(loadSavedConfig()?.bindings.acceptFirstSuggestion).toBeNull();
});
