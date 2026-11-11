import { useEffect, useRef, useState } from "react";
import { defaultBindings, leftDialConfig, rightDialConfig } from "../typing";
import type { GamepadSnapshot } from "../typing";
import { ControllerDials } from "./ControllerDials";
import { useInputPreferences } from "./useInputPreferences";
import { loadSavedConfig, saveConfig } from "./savedConfig";
import { ConfigPage } from "./ConfigPage";
import { ControllerSetup } from "./ControllerSetup";
import { ControllerHud } from "./ControllerHud";
import { ThemePicker } from "./ThemePicker";
import { loadTheme, saveTheme } from "./themes";
import type { ThemeId } from "./themes";
import {
  isControllerProfile,
  loadProfile,
  saveProfile,
  withAxisButtons,
} from "./controllerSetup";
import type { ControllerProfile } from "./controllerSetup";

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
  const [profiles, setProfiles] = useState<Record<string, ControllerProfile>>(
    {},
  );
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
          profiles: Record<string, ControllerProfile>;
        };
        if (active) {
          setPad(Object.values(status.gamepads)[0] ?? null);
          setKeyboardError(status.keyboardError);
          setAutocomplete(status.autocomplete);
          setProfiles((current) => ({
            ...(status.profiles ?? {}),
            ...current,
          }));
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

  return { pad, keyboardError, autocomplete, profiles, setProfiles };
}

export function DesktopApp() {
  const [theme, setTheme] = useState(loadTheme);
  const changeTheme = (next: ThemeId) => {
    setTheme(next);
    saveTheme(next);
  };
  const {
    pad: connectedPad,
    keyboardError,
    autocomplete,
    profiles,
    setProfiles,
  } = useDesktopPad();
  const rawPad = connectedPad ?? disconnectedPad;
  const [saved] = useState(loadSavedConfig);
  const [layout, setLayout] = useState(
    saved?.layout ?? { left: leftDialConfig, right: rightDialConfig },
  );
  const [legacyBindings, setLegacyBindings] = useState(
    saved?.bindings ?? defaultBindings,
  );
  const profile = isControllerProfile(profiles[rawPad.id])
    ? profiles[rawPad.id]
    : loadProfile(rawPad.id);
  const pad = withAxisButtons(rawPad, profile?.axisRest);
  const bindings = profile?.bindings ?? legacyBindings;
  const [activeLayerId, setActiveLayerId] = useState(layout.left.layers[0].id);
  const [page, setPage] = useState<"dials" | "config">("dials");
  const [capturing, setCapturing] = useState(false);
  const previousStart = useRef(false);
  const preferences = useInputPreferences(pad.id);
  const leftMapping = profile?.leftMapping ?? preferences.leftMapping;
  const rightMapping = profile?.rightMapping ?? preferences.rightMapping;
  const deadzone = profile?.deadzone ?? preferences.deadzone;
  const [setupId, setSetupId] = useState<string | null>(null);
  const setupOpen = Boolean(
    connectedPad && (setupId === pad.id || !profile?.accepted),
  );
  const profileBase = (): ControllerProfile =>
    profile ?? {
      accepted: false,
      bindings,
      leftMapping,
      rightMapping,
      deadzone,
      discovered: [],
    };
  const updateProfile = (next: ControllerProfile) => {
    saveProfile(pad.id, next);
    setProfiles((current) => ({ ...current, [pad.id]: next }));
    void fetch("/api/desktop/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pad.id, profile: next }),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Could not save controller: ${response.status}`);
      })
      .catch((reason: unknown) => setError(String(reason)));
  };
  const setBindings = (next: typeof bindings) => {
    setLegacyBindings(next);
    if (connectedPad)
      updateProfile({ ...profileBase(), accepted: true, bindings: next });
  };
  const setDeadzone = (next: number) => {
    preferences.setDeadzone(next);
    if (connectedPad) updateProfile({ ...profileBase(), deadzone: next });
  };
  const [error, setError] = useState("");
  const startIndex = bindings.submit;
  const startPressed =
    startIndex === null ? false : (pad.buttons[startIndex]?.pressed ?? false);

  useEffect(
    () => saveConfig({ layout, bindings: legacyBindings }),
    [layout, legacyBindings],
  );
  useEffect(() => {
    if (startPressed && !previousStart.current && !capturing && !setupOpen) {
      setPage((current) => (current === "dials" ? "config" : "dials"));
    }
    previousStart.current = startPressed;
  }, [startPressed, capturing, setupOpen]);

  const reset = () => {
    setLayout({ left: leftDialConfig, right: rightDialConfig });
    setBindings(defaultBindings);
    setActiveLayerId(leftDialConfig.layers[0].id);
  };

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
        axisRest: profile?.axisRest,
        typingEnabled:
          page === "dials" && profile?.accepted === true && !setupOpen,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Desktop config: ${response.status}`);
      })
      .catch((reason: unknown) => setError(String(reason)));
  }, [
    layout,
    bindings,
    activeLayerId,
    leftMapping,
    rightMapping,
    deadzone,
    page,
    profile?.accepted,
    profile?.axisRest,
    setupOpen,
  ]);

  return (
    <div className="desktop-app" data-theme={theme}>
      <header className="desktop-header">
        <div>
          <div className="desktop-brand">StickShift</div>
          <span>{connectedPad?.id ?? "Connect a controller"}</span>
        </div>
        <nav aria-label="Desktop pages" className="desktop-nav">
          <button
            type="button"
            aria-current={page === "dials" ? "page" : undefined}
            onClick={() => setPage("dials")}
          >
            Dials
          </button>
          <button
            type="button"
            aria-current={page === "config" ? "page" : undefined}
            onClick={() => setPage("config")}
          >
            Config
          </button>
        </nav>
      </header>
      {page === "dials" && (
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
      )}
      <main>
        {page === "dials" ? (
          <>
            <ControllerDials
              pad={setupOpen ? disconnectedPad : pad}
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
            <ControllerHud
              pad={pad}
              leftMapping={leftMapping}
              rightMapping={rightMapping}
              bindings={bindings}
              visualButtons={profile?.visualButtons}
            />
          </>
        ) : (
          <ConfigPage
            pad={setupOpen ? disconnectedPad : pad}
            layout={layout}
            onLayoutChange={setLayout}
            bindings={bindings}
            onBindingsChange={setBindings}
            activeLayerId={activeLayerId}
            onActiveLayerChange={setActiveLayerId}
            leftMapping={leftMapping}
            rightMapping={rightMapping}
            onCaptureChange={setCapturing}
            onResetDefaults={reset}
            onOpenControllerSetup={
              connectedPad ? () => setSetupId(pad.id) : undefined
            }
          />
        )}
      </main>
      <footer className="desktop-footer">
        <span>Focus another app to type with the controller.</span>
        <ThemePicker theme={theme} onChange={changeTheme} />
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
      {setupOpen && connectedPad && (
        <ControllerSetup
          key={pad.id}
          pad={rawPad}
          initial={profileBase()}
          newController={!profile?.accepted}
          onSave={(next) => {
            updateProfile(next);
            setSetupId(null);
          }}
          onClose={() => setSetupId(null)}
        />
      )}
    </div>
  );
}
