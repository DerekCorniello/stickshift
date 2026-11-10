import { useEffect, useReducer, useRef, useState } from "react";
import {
  actionLabels,
  defaultBindings,
  leftDialConfig,
  rightDialConfig,
  useGamepads,
} from "../typing";
import type { ControlAction, GamepadSnapshot } from "../typing";
import { PracticePage } from "./PracticePage";
import { TypingTestPage } from "./TypingTestPage";
import { ComparisonPage } from "./ComparisonPage";
import { DebugPage } from "./DebugPage";
import { ConfigPage } from "./ConfigPage";
import { editorReducer, initialEditorState } from "./practiceEditor";
import { loadSavedConfig, saveConfig } from "./savedConfig";
import { GamepadButtonLabel } from "./GamepadButtonLabel";
import { getControllerInfo } from "./gamepadLabels";
import { InputSettingsContext } from "./inputSettings";
import { useInputPreferences } from "./useInputPreferences";
import { ControllerSetup } from "./ControllerSetup";
import { ControllerHud } from "./ControllerHud";
import { ThemePicker } from "./ThemePicker";
import { loadTheme, saveTheme } from "./themes";
import type { ThemeId } from "./themes";
import { loadProfile, saveProfile, withAxisButtons } from "./controllerSetup";
import type { ControllerProfile } from "./controllerSetup";
import "./fieldnotesTheme.css";
import "./demo.css";

const pages = [
  { id: "practice", label: "Practice" },
  { id: "test", label: "Speed test" },
  { id: "compare", label: "Head to head" },
  { id: "config", label: "Customize" },
  { id: "debug", label: "Diagnostics" },
] as const;
type Page = (typeof pages)[number]["id"];
const disconnectedPad: GamepadSnapshot = {
  id: "No controller connected",
  index: -1,
  connected: false,
  mapping: "standard",
  axes: [0, 0, 0, 0],
  buttons: [],
};
const initialPage = (): Page =>
  pages.find((page) => page.id === location.hash.slice(1))?.id ?? "practice";

export function DemoApp() {
  const [theme, setTheme] = useState(loadTheme);
  const changeTheme = (next: ThemeId) => {
    setTheme(next);
    saveTheme(next);
  };
  const gamepads = useGamepads();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const connected = Object.values(gamepads);
  const connectedIndices = connected.map((pad) => pad.index).join(",");
  const previousIndices = useRef<Set<number>>(new Set());
  useEffect(() => {
    const current = new Set(connected.map((pad) => pad.index));
    const newlyConnected = connected.find(
      (pad) => !previousIndices.current.has(pad.index),
    );
    previousIndices.current = current;
    if (newlyConnected) setSelectedIndex(newlyConnected.index);
  }, [connected, connectedIndices]);
  const realPad =
    connected.find((pad) => pad.index === selectedIndex) ?? connected[0];
  const rawPad = realPad ?? disconnectedPad;
  const [page, setPage] = useState<Page>(initialPage);
  const [saved] = useState(loadSavedConfig);
  const [layout, setLayout] = useState(
    saved?.layout ?? { left: leftDialConfig, right: rightDialConfig },
  );
  const [legacyBindings, setLegacyBindings] = useState(
    saved?.bindings ?? defaultBindings,
  );
  const [profiles, setProfiles] = useState<Record<string, ControllerProfile>>(
    {},
  );
  const profile = profiles[rawPad.id] ?? loadProfile(rawPad.id);
  const pad = withAxisButtons(rawPad, profile?.axisRest);
  const bindings = profile?.bindings ?? legacyBindings;
  const [activeLayerId, setActiveLayerId] = useState(layout.left.layers[0].id);
  const preferences = useInputPreferences(pad.id);
  const leftMapping = profile?.leftMapping ?? preferences.leftMapping;
  const rightMapping = profile?.rightMapping ?? preferences.rightMapping;
  const deadzone = profile?.deadzone ?? preferences.deadzone;
  const [setupId, setSetupId] = useState<string | null>(null);
  const setupOpen = Boolean(
    realPad && (setupId === pad.id || !profile?.accepted),
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
  };
  const setBindings = (next: typeof bindings) => {
    setLegacyBindings(next);
    if (realPad)
      updateProfile({ ...profileBase(), accepted: true, bindings: next });
  };
  const setLeftMapping = (next: typeof leftMapping) => {
    preferences.setLeftMapping(next);
    if (realPad) updateProfile({ ...profileBase(), leftMapping: next });
  };
  const setRightMapping = (next: typeof rightMapping) => {
    preferences.setRightMapping(next);
    if (realPad) updateProfile({ ...profileBase(), rightMapping: next });
  };
  const setDeadzone = (next: number) => {
    preferences.setDeadzone(next);
    if (realPad) updateProfile({ ...profileBase(), deadzone: next });
  };
  const [editorState, onEditorAction] = useReducer(
    editorReducer,
    initialEditorState,
  );
  const [capturing, setCapturing] = useState(false);
  useEffect(
    () => saveConfig({ layout, bindings: legacyBindings }),
    [layout, legacyBindings],
  );
  useEffect(() => {
    const change = () => setPage(initialPage());
    window.addEventListener("hashchange", change);
    window.addEventListener("popstate", change);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("popstate", change);
    };
  }, []);
  const navigate = (next: Page) => {
    window.history.pushState(null, "", `#${next}`);
    setPage(next);
  };
  const previousStart = useRef(false);
  const startIndex = bindings.submit;
  const start =
    startIndex === null ? false : (pad.buttons[startIndex]?.pressed ?? false);
  useEffect(() => {
    const pressed = start && !previousStart.current;
    previousStart.current = start;
    if (
      !pressed ||
      capturing ||
      setupOpen ||
      page === "test" ||
      page === "compare"
    )
      return;
    const timer = setTimeout(() => {
      navigate(
        pages[(pages.findIndex((item) => item.id === page) + 1) % pages.length]
          .id,
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [start, capturing, setupOpen, page]);
  const reset = () => {
    setLayout({ left: leftDialConfig, right: rightDialConfig });
    setBindings(defaultBindings);
    setActiveLayerId(leftDialConfig.layers[0].id);
  };
  const common = {
    pad: setupOpen ? disconnectedPad : pad,
    leftConfig: layout.left,
    rightConfig: layout.right,
    activeLayerId,
    onActiveLayerChange: setActiveLayerId,
    leftMapping,
    rightMapping,
    bindings,
    deadzone,
  };
  const actions: ControlAction[] =
    page === "test" || page === "compare"
      ? ["space", "backspace", "enter", "submit", "previousLayer", "nextLayer"]
      : [
          "space",
          "backspace",
          "enter",
          "autocomplete",
          "acceptFirstSuggestion",
          "previousLayer",
          "nextLayer",
        ];

  return (
    <InputSettingsContext.Provider value={{ deadzone }}>
      <div className="variant-app fieldnotes" data-theme={theme}>
        <header className="variant-header">
          <a className="variant-brand" href="/">
            <span aria-hidden="true">((s))</span> StickShift
          </a>
          <ThemePicker theme={theme} onChange={changeTheme} />
          <div className="variant-status">
            {realPad ? (
              <>
                <span className="status-dot" />
                {getControllerInfo(realPad.id).name}
              </>
            ) : (
              "Connect a controller"
            )}
            {connected.length > 1 && (
              <select
                aria-label="Controller"
                value={pad.index}
                onChange={(event) =>
                  setSelectedIndex(Number(event.target.value))
                }
              >
                {connected.map((item) => (
                  <option key={item.index} value={item.index}>
                    {getControllerInfo(item.id).name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>
        <nav className="variant-nav" aria-label="Demo pages">
          {pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="variant-workspace">
          {page === "practice" && (
            <PracticePage
              {...common}
              editorState={editorState}
              onEditorAction={onEditorAction}
            />
          )}
          {page === "test" && <TypingTestPage {...common} />}
          {page === "compare" && <ComparisonPage {...common} />}
          {page === "debug" && (
            <DebugPage
              {...common}
              gamepads={realPad ? gamepads : { [-1]: pad }}
              onLeftMappingChange={setLeftMapping}
              onRightMappingChange={setRightMapping}
            />
          )}
          {page === "config" && (
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
                realPad ? () => setSetupId(pad.id) : undefined
              }
            />
          )}
          {(page === "practice" || page === "test" || page === "compare") && (
            <ControllerHud
              pad={pad}
              leftMapping={leftMapping}
              rightMapping={rightMapping}
              bindings={bindings}
              visualButtons={profile?.visualButtons}
            />
          )}
        </div>
        <aside className="variant-sidebar" aria-label="Session controls">
          <section className="sidebar-section sidebar-controls">
            <h3>Controls</h3>
            <div className="quick-controls">
              {actions.slice(0, 4).map((action) => (
                <div className="quick-control" key={action}>
                  <span className="quick-control__action">
                    {actionLabels[action]}
                  </span>
                  {bindings[action] !== null && (
                    <GamepadButtonLabel
                      pad={pad}
                      gamepadId={pad.id}
                      buttonIndex={bindings[action]!}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
          <details className="sidebar-section input-tuning">
            <summary>Input settings</summary>
            <label>
              Deadzone <output>{Math.round(deadzone * 100)}%</output>
              <input
                aria-label="Stick deadzone"
                type="range"
                min="0.05"
                max="0.5"
                step="0.01"
                value={deadzone}
                onChange={(event) => setDeadzone(Number(event.target.value))}
              />
            </label>
          </details>
        </aside>
      </div>
      {setupOpen && realPad && (
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
    </InputSettingsContext.Provider>
  );
}
