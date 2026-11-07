import { StrictMode, useEffect, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultBindings,
  leftDialConfig,
  rightDialConfig,
  useGamepads,
} from "../typing";
import { DebugPage } from "./DebugPage";
import { ConfigPage } from "./ConfigPage";
import type { Layout } from "./configModel";
import type { AxisMapping } from "./axisMapping";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { PracticePage } from "./PracticePage";
import { editorReducer, initialEditorState } from "./practiceEditor";
import { loadSavedConfig, saveConfig } from "./savedConfig";
import "./app.css";

type PageId = "practice" | "debug" | "config";

const pages: readonly Readonly<{ id: PageId; label: string }>[] = [
  { id: "practice", label: "Practice" },
  { id: "debug", label: "Debug" },
  { id: "config", label: "Config" },
];

function App() {
  const gamepads = useGamepads();
  const [savedConfig] = useState(loadSavedConfig);
  const [page, setPage] = useState<PageId>("practice");
  const [selectedPadIndex, setSelectedPadIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>(
    savedConfig?.layout ?? {
      left: leftDialConfig,
      right: rightDialConfig,
    },
  );
  const [bindings, setBindings] = useState(
    savedConfig?.bindings ?? defaultBindings,
  );
  const [configCapturing, setConfigCapturing] = useState(false);
  useEffect(() => saveConfig({ layout, bindings }), [layout, bindings]);
  const [editorState, onEditorAction] = useReducer(
    editorReducer,
    initialEditorState,
  );
  const [activeLayerId, setActiveLayerId] = useState(layout.left.layers[0].id);
  const [leftMapping, setLeftMapping] =
    useState<AxisMapping>(defaultLeftMapping);
  const [rightMapping, setRightMapping] =
    useState<AxisMapping>(defaultRightMapping);
  const deadzone = 0.2;
  const leftConfig = layout.left;
  const rightConfig = layout.right;
  const resetConfigToDefaults = () => {
    setLayout({ left: leftDialConfig, right: rightDialConfig });
    setBindings(defaultBindings);
    setActiveLayerId(leftDialConfig.layers[0].id);
    setLeftMapping(defaultLeftMapping);
    setRightMapping(defaultRightMapping);
  };
  const connectedPads = Object.values(gamepads);
  const selectedPad =
    connectedPads.find((pad) => pad.index === selectedPadIndex) ??
    connectedPads[0];
  const pageButtonHeld =
    selectedPad?.buttons[9]?.pressed === true ||
    (selectedPad?.buttons[9]?.value ?? 0) >= 0.5;
  const previousPageButtonHeld = useRef(false);
  useEffect(() => {
    const shouldCycle =
      pageButtonHeld && !previousPageButtonHeld.current && !configCapturing;
    previousPageButtonHeld.current = pageButtonHeld;
    if (!shouldCycle) return;
    const timer = setTimeout(
      () =>
        setPage(
          (current) =>
            pages[
              (pages.findIndex((item) => item.id === current) + 1) %
                pages.length
            ].id,
        ),
      0,
    );
    return () => clearTimeout(timer);
  }, [pageButtonHeld, configCapturing]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="app-brand"
          type="button"
          onClick={() => setPage("practice")}
        >
          StickShift
        </button>
        <nav aria-label="Main navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              className="app-nav__item"
              type="button"
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="app-header__hint">Start: next page</span>
        </nav>
        <div className="app-header__controller">
          {selectedPad ? (
            connectedPads.length > 1 ? (
              <label>
                Controller
                <select
                  value={selectedPad.index}
                  onChange={(event) =>
                    setSelectedPadIndex(Number(event.target.value))
                  }
                >
                  {connectedPads.map((pad) => (
                    <option key={pad.index} value={pad.index}>
                      {pad.index}: {pad.id}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="connection-badge">{selectedPad.id}</span>
            )
          ) : (
            <span className="connection-badge connection-badge--offline">
              Controller disconnected
            </span>
          )}
        </div>
      </header>

      {selectedPad ? (
        page === "practice" ? (
          <PracticePage
            pad={selectedPad}
            leftConfig={leftConfig}
            rightConfig={rightConfig}
            activeLayerId={activeLayerId}
            onActiveLayerChange={setActiveLayerId}
            leftMapping={leftMapping}
            rightMapping={rightMapping}
            bindings={bindings}
            deadzone={deadzone}
            editorState={editorState}
            onEditorAction={onEditorAction}
          />
        ) : page === "debug" ? (
          <DebugPage
            pad={selectedPad}
            gamepads={gamepads}
            leftConfig={leftConfig}
            rightConfig={rightConfig}
            activeLayerId={activeLayerId}
            onActiveLayerChange={setActiveLayerId}
            leftMapping={leftMapping}
            rightMapping={rightMapping}
            onLeftMappingChange={setLeftMapping}
            onRightMappingChange={setRightMapping}
            bindings={bindings}
            deadzone={deadzone}
          />
        ) : (
          <ConfigPage
            pad={selectedPad}
            layout={layout}
            onLayoutChange={setLayout}
            bindings={bindings}
            onBindingsChange={setBindings}
            activeLayerId={activeLayerId}
            onActiveLayerChange={setActiveLayerId}
            leftMapping={leftMapping}
            rightMapping={rightMapping}
            onCaptureChange={setConfigCapturing}
            onResetDefaults={resetConfigToDefaults}
          />
        )
      ) : (
        <main className="page-shell empty-state">
          <p className="page-eyebrow">Connect to begin</p>
          <h1>Connect a controller</h1>
          <p>
            Press a button on your controller, then choose it in the browser
            prompt. Connect a controller to open Practice, Debug, and Config.
          </p>
        </main>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Application root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
