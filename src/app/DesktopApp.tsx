import { useEffect, useState } from "react";
import { defaultBindings, leftDialConfig, rightDialConfig } from "../typing";
import type { GamepadSnapshot } from "../typing";
import { ControllerDials } from "./ControllerDials";
import { useInputPreferences } from "./useInputPreferences";
import { loadSavedConfig } from "./savedConfig";

const disconnectedPad: GamepadSnapshot = {
  id: "No controller connected",
  index: -1,
  connected: false,
  mapping: "standard",
  axes: [0, 0, 0, 0],
  buttons: [],
};

function useDesktopPad() {
  const [pad, setPad] = useState<GamepadSnapshot | null>(null);
  const [keyboardError, setKeyboardError] = useState("");
  const [autocomplete, setAutocomplete] = useState({
    active: false,
    word: "",
    suggestions: [] as string[],
    selectedIndex: 0,
  });

  useEffect(() => {
    let active = true;
    let timer: number;
    const poll = async () => {
      try {
        const response = await fetch("/api/desktop");
        if (!response.ok) throw new Error(`Desktop input: ${response.status}`);
        const status = (await response.json()) as {
          gamepads: Record<number, GamepadSnapshot>;
          keyboardError: string;
          autocomplete: {
            active: boolean;
            word: string;
            suggestions: string[];
            selectedIndex: number;
          };
        };
        if (active) {
          setPad(Object.values(status.gamepads)[0] ?? null);
          setKeyboardError(status.keyboardError);
          setAutocomplete(status.autocomplete);
        }
      } catch (error) {
        if (active) console.error("Could not read desktop controller", error);
      } finally {
        if (active) timer = window.setTimeout(poll, 33);
      }
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return { pad, keyboardError, autocomplete };
}

export function DesktopApp() {
  const { pad: connectedPad, keyboardError, autocomplete } = useDesktopPad();
  const pad = connectedPad ?? disconnectedPad;
  const [saved] = useState(loadSavedConfig);
  const [layout] = useState(
    saved?.layout ?? { left: leftDialConfig, right: rightDialConfig },
  );
  const [bindings] = useState(saved?.bindings ?? defaultBindings);
  const [activeLayerId, setActiveLayerId] = useState(layout.left.layers[0].id);
  const { leftMapping, rightMapping, deadzone, setDeadzone } =
    useInputPreferences(pad.id);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/desktop/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layout,
        bindings,
        activeLayerId,
        leftMapping,
        rightMapping,
        deadzone,
      }),
    }).catch((reason: unknown) => setError(String(reason)));
  }, [layout, bindings, activeLayerId, leftMapping, rightMapping, deadzone]);

  return (
    <div className="desktop-app">
      <header className="desktop-header">
        <div>
          <div className="desktop-brand">StickShift</div>
          <span>{connectedPad?.id ?? "Connect a controller"}</span>
        </div>
      </header>
      <section
        className="desktop-autocomplete"
        aria-label="Autocomplete suggestions"
      >
        <div>
          Suggestions for <strong>{autocomplete.word || "…"}</strong>
          {autocomplete.active && <span> · choose with the D-pad</span>}
        </div>
        <ol>
          {autocomplete.suggestions.map((word, index) => (
            <li
              key={word}
              aria-current={
                autocomplete.active && index === autocomplete.selectedIndex
                  ? "true"
                  : undefined
              }
            >
              {word}
            </li>
          ))}
        </ol>
        {autocomplete.suggestions.length === 0 && <span>No matches yet</span>}
      </section>
      <main>
        <ControllerDials
          pad={pad}
          leftConfig={layout.left}
          rightConfig={layout.right}
          activeLayerId={activeLayerId}
          onActiveLayerChange={setActiveLayerId}
          leftMapping={leftMapping}
          rightMapping={rightMapping}
          bindings={bindings}
          deadzone={deadzone}
          showDiagnostics={false}
        />
      </main>
      <footer className="desktop-footer">
        <span>Focus another app to type with the controller.</span>
        <label>
          Deadzone {Math.round(deadzone * 100)}%
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={deadzone}
            onChange={(event) => setDeadzone(Number(event.target.value))}
          />
        </label>
        {(error || keyboardError) && (
          <span role="alert">{error || keyboardError}</span>
        )}
      </footer>
    </div>
  );
}
