import { StrictMode, useReducer, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  defaultBindings,
  leftDialConfig,
  rightDialConfig,
  useGamepads,
} from "../typing";
import { DebugPage } from "./DebugPage";
import type { AxisMapping } from "./axisMapping";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import { PracticePage } from "./PracticePage";
import { editorReducer, initialEditorState } from "./practiceEditor";
import "./app.css";

type PageId = "practice" | "debug";

const pages: readonly Readonly<{ id: PageId; label: string }>[] = [
  { id: "practice", label: "Practice" },
  { id: "debug", label: "Debug" },
];

function App() {
  const gamepads = useGamepads();
  const [page, setPage] = useState<PageId>("practice");
  const [selectedPadIndex, setSelectedPadIndex] = useState(0);
  const [editorState, onEditorAction] = useReducer(
    editorReducer,
    initialEditorState,
  );
  const [activeLayerId, setActiveLayerId] = useState(
    leftDialConfig.layers[0].id,
  );
  const [leftMapping, setLeftMapping] =
    useState<AxisMapping>(defaultLeftMapping);
  const [rightMapping, setRightMapping] =
    useState<AxisMapping>(defaultRightMapping);
  const bindings = defaultBindings;
  const deadzone = 0.2;
  const leftConfig = leftDialConfig;
  const rightConfig = rightDialConfig;
  const connectedPads = Object.values(gamepads);
  const selectedPad =
    connectedPads.find((pad) => pad.index === selectedPadIndex) ??
    connectedPads[0];

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
        ) : null
      ) : (
        <main className="page-shell empty-state">
          <p className="page-eyebrow">Connect to begin</p>
          <h1>Connect a controller</h1>
          <p>
            Press a button on your controller, then choose it in the browser
            prompt. Connect a controller to open Practice and Debug.
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
