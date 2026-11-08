// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopApp } from "./DesktopApp";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("desktop configuration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("opens the shared editor, saves changes, and pauses typing while it is open", async () => {
    const requests: Record<string, unknown>[] = [];
    const pad = {
      id: "Pad",
      index: 0,
      connected: true,
      mapping: "standard",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({
        pressed: false,
        value: 0,
      })),
    };
    vi.stubGlobal("fetch", async (url: string, options?: RequestInit) => {
      if (url === "/api/desktop/config") {
        requests.push(JSON.parse(String(options?.body)));
        return { ok: true };
      }
      return {
        ok: true,
        json: async () => ({
          gamepads: { 0: pad },
          keyboardError: "",
          autocomplete: {
            active: false,
            word: "",
            suggestions: [],
            selectedIndex: 0,
          },
        }),
      };
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<DesktopApp />));
      expect(container.querySelector(".controller-dials")).not.toBeNull();
      const configButton = container.querySelector<HTMLButtonElement>(
        ".desktop-nav button:nth-child(2)",
      );
      await act(async () => configButton?.click());
      expect(container.querySelector(".config-page")).not.toBeNull();
      expect(requests.at(-1)?.typingEnabled).toBe(false);

      const addSlice = container.querySelector<HTMLButtonElement>(
        ".config-page__slice-actions button:first-child",
      );
      await act(async () => addSlice?.click());
      expect(
        container.querySelector(".config-page__dial--active h3")?.textContent,
      ).toContain("14 slices");
      expect(requests.at(-1)?.typingEnabled).toBe(false);
      expect(localStorage.getItem("stickshift.config.v1")).toContain(
        "custom-slice",
      );

      const dialsButton = container.querySelector<HTMLButtonElement>(
        ".desktop-nav button:first-child",
      );
      await act(async () => dialsButton?.click());
      expect(container.querySelector(".controller-dials")).not.toBeNull();
      expect(requests.at(-1)?.typingEnabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
