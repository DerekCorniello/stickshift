import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import GamepadVisualizer from "./gamepadVisualizer";
import { useGamepads } from "../typing";
import { ControllerDials } from "./ControllerDials";
import { AutocompleteBar } from "./AutocompleteBar";
import type { ControlAction } from "../typing";

function App() {
  const gamepads = useGamepads();
  const [word, setWord] = useState("");
  const [selectedPadIndex, setSelectedPadIndex] = useState(0);
  const connectedPads = Object.values(gamepads);
  const selectedPad =
    connectedPads.find((pad) => pad.index === selectedPadIndex) ??
    connectedPads[0];
  const handleGamepadAction = (action: ControlAction) => {
    if (action === "backspace") {
      setWord((currentWord) => currentWord.slice(0, -1));
    } else if (action === "space") {
      setWord((currentWord) => `${currentWord} `);
    }
  };

  return (
    <>
      <AutocompleteBar value={word} onChange={setWord} />
      {selectedPad && (
        <div style={{ backgroundColor: "#000", padding: 20 }}>
          {connectedPads.length > 1 && (
            <label
              style={{ display: "block", color: "#fff", marginBottom: 12 }}
            >
              Controller{" "}
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
          )}
          <ControllerDials
            key={`${selectedPad.index}:${selectedPad.id}`}
            pad={selectedPad}
            onCharacterInput={(character) =>
              setWord((currentWord) => currentWord + character)
            }
            onActionInput={handleGamepadAction}
          />
        </div>
      )}
      <GamepadVisualizer gamepads={gamepads} />
    </>
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
