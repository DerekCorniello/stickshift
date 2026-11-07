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
import "./variants.css";

const pages = [
  {
    id: "practice",
    label: "Practice",
    title: "Two sticks. Every word.",
    description: "Aim. Release. Type.",
  },
  {
    id: "test",
    label: "Speed test",
    title: "Find your typing rhythm.",
    description: "One passage. Two minutes.",
  },
  {
    id: "compare",
    label: "Head to head",
    title: "Let your thumbs decide.",
    description: "One stick versus two.",
  },
  {
    id: "config",
    label: "Customize",
    title: "Make it feel like yours.",
    description: "Arrange letters and controls.",
  },
  {
    id: "debug",
    label: "Diagnostics",
    title: "Every movement, visible.",
    description: "Inspect and calibrate your controller.",
  },
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
const designs = ["Cockpit", "Fieldnotes", "Arcade", "Lab", "Arena"];
const initialPage = (): Page =>
  pages.find((page) => page.id === location.hash.slice(1))?.id ?? "practice";

export function VariantApp({ variant }: { variant: number }) {
  const gamepads = useGamepads();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const connected = Object.values(gamepads);
  const realPad =
    connected.find((pad) => pad.index === selectedIndex) ?? connected[0];
  const pad = realPad ?? disconnectedPad;
  const [page, setPage] = useState<Page>(initialPage);
  const [saved] = useState(loadSavedConfig);
  const [layout, setLayout] = useState(
    saved?.layout ?? { left: leftDialConfig, right: rightDialConfig },
  );
  const [bindings, setBindings] = useState(saved?.bindings ?? defaultBindings);
  const [activeLayerId, setActiveLayerId] = useState(layout.left.layers[0].id);
  const {
    leftMapping,
    setLeftMapping,
    rightMapping,
    setRightMapping,
    deadzone,
    setDeadzone,
    selectionMode,
    setSelectionMode,
  } = useInputPreferences(pad.id);
  const [editorState, onEditorAction] = useReducer(
    editorReducer,
    initialEditorState,
  );
  const [capturing, setCapturing] = useState(false);
  useEffect(() => saveConfig({ layout, bindings }), [layout, bindings]);
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
  const start = pad.buttons[9]?.pressed ?? false;
  useEffect(() => {
    const pressed = start && !previousStart.current;
    previousStart.current = start;
    if (!pressed || capturing || page === "test" || page === "compare") return;
    const timer = setTimeout(() => {
      navigate(
        pages[(pages.findIndex((item) => item.id === page) + 1) % pages.length]
          .id,
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [start, capturing, page]);
  const reset = () => {
    setLayout({ left: leftDialConfig, right: rightDialConfig });
    setBindings(defaultBindings);
    setActiveLayerId(leftDialConfig.layers[0].id);
  };
  const common = {
    pad,
    leftConfig: layout.left,
    rightConfig: layout.right,
    activeLayerId,
    onActiveLayerChange: setActiveLayerId,
    leftMapping,
    rightMapping,
    bindings,
    deadzone,
  };
  const current = pages.find((item) => item.id === page)!;
  const actions: ControlAction[] =
    page === "test" || page === "compare"
      ? ["space", "backspace", "enter", "submit", "previousLayer", "nextLayer"]
      : [
          "space",
          "backspace",
          "enter",
          "autocomplete",
          "previousLayer",
          "nextLayer",
        ];

  return (
    <InputSettingsContext.Provider value={{ selectionMode, deadzone }}>
      <div className={`variant-app ui-${variant}`}>
        <header className="variant-header">
          <a className="variant-brand" href={`/ui-${variant}`}>
            <span aria-hidden="true">((s))</span> StickShift
          </a>
          <div className="variant-switcher" aria-label="Interface designs">
            {designs.map((name, index) => (
              <a
                key={name}
                href={`/ui-${index + 1}${window.location.hash}`}
                aria-current={variant === index + 1 ? "page" : undefined}
                title={name}
              >
                {String(index + 1).padStart(2, "0")}
              </a>
            ))}
            <a href="/original">Original</a>
          </div>
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
        <section className="variant-intro">
          <p className="variant-kicker">
            {designs[variant - 1]} / Controller-first typing
          </p>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </section>
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
              pad={pad}
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
            />
          )}
        </div>
        <aside className="variant-sidebar" aria-label="Session controls">
          <section className="sidebar-section sidebar-overview">
            <p>
              {realPad
                ? selectionMode === "manual"
                  ? "Aim, then click the stick to type."
                  : "Aim, then release to type."
                : "Connect a controller to type."}
            </p>
            <div className="sidebar-stats">
              <div>
                <strong>
                  {page === "practice" ? editorState.text.length : "2:00"}
                </strong>
                <span>{page === "practice" ? "characters" : "run limit"}</span>
              </div>
              <div>
                <strong>{layout.left.layers.length}</strong>
                <span>layers</span>
              </div>
            </div>
          </section>
          <section className="sidebar-section sidebar-controls">
            <h3>Controls</h3>
            <div className="quick-controls">
              {actions.slice(0, 4).map((action) => (
                <div className="quick-control" key={action}>
                  <span>{actionLabels[action]}</span>
                  {bindings[action] !== null && (
                    <GamepadButtonLabel
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
              Selection
              <select
                value={selectionMode}
                onChange={(event) =>
                  setSelectionMode(event.target.value as "auto" | "manual")
                }
              >
                <option value="auto">Release to type</option>
                <option value="manual">Click stick to type</option>
              </select>
            </label>
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
          <button
            className="demo-next"
            type="button"
            onClick={() =>
              navigate(
                pages[
                  (pages.findIndex((item) => item.id === page) + 1) %
                    pages.length
                ].id,
              )
            }
          >
            {page === "practice"
              ? "Next: test your speed"
              : page === "test"
                ? "Next: compare both methods"
                : "Continue the demo"}{" "}
            <span aria-hidden="true">&rarr;</span>
          </button>
        </aside>
        <footer className="variant-footer">
          <span>{String(variant).padStart(2, "0")} / 05</span>
        </footer>
      </div>
    </InputSettingsContext.Provider>
  );
}
