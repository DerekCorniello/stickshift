import React from "react";
import { createRoot } from "react-dom/client";
import GamepadVisualizer from "./gamepadVisualizer";
import { useGamepads } from "./useGamepad";

function App() {
  const gamepads = useGamepads();

  return <GamepadVisualizer gamepads={gamepads} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
