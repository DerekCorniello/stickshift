import { useState } from "react";
import type { ButtonBindings, GamepadSnapshot } from "../typing";
import type { DialConfig } from "../typing";
import GamepadVisualizer from "./gamepadVisualizer";
import { Controller } from "./Controller";
import type { AxisMapping } from "./axisMapping";
import { getControllerInfo } from "./gamepadLabels";
import "./pages.css";

type DebugPageProps = Readonly<{
  pad: GamepadSnapshot;
  gamepads: Readonly<Record<number, GamepadSnapshot>>;
  leftConfig: DialConfig;
  rightConfig: DialConfig;
  activeLayerId: string;
  onActiveLayerChange: (layerId: string) => void;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  onLeftMappingChange: (mapping: AxisMapping) => void;
  onRightMappingChange: (mapping: AxisMapping) => void;
  bindings: ButtonBindings;
  deadzone: number;
}>;

export function DebugPage({
  pad,
  gamepads,
  leftConfig,
  rightConfig,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  onLeftMappingChange,
  onRightMappingChange,
  bindings,
  deadzone,
}: DebugPageProps) {
  const [typedText, setTypedText] = useState("");
  const currentWord = typedText.match(/[A-Za-z]+$/)?.[0] ?? "";

  return (
    <main className="page-shell debug-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Debug</p>
          <h1>Controller diagnostics</h1>
          <p>Inspect raw axes, button events, and dial selection behavior.</p>
        </div>
        <span className="connection-badge">
          {getControllerInfo(pad.id).name}
        </span>
      </header>
      <section className="debug-page__text" aria-label="Debug typed text">
        <h2>Controller text</h2>
        <output aria-label="Typed text">
          {typedText || "Start typing with the dials."}
        </output>
      </section>
      <Controller
        pad={pad}
        value={currentWord}
        onValueChange={(value) =>
          setTypedText((current) => current.replace(/[A-Za-z]*$/, value))
        }
        onCharacterInput={(character) =>
          setTypedText((current) => current + character)
        }
        onActionInput={(action) => {
          if (action === "backspace") {
            setTypedText((current) => current.slice(0, -1));
          } else if (action === "space") {
            setTypedText((current) => current + " ");
          } else if (action === "enter") {
            setTypedText((current) => current + "\n");
          }
        }}
        leftConfig={leftConfig}
        rightConfig={rightConfig}
        activeLayerId={activeLayerId}
        onActiveLayerChange={onActiveLayerChange}
        leftMapping={leftMapping}
        rightMapping={rightMapping}
        onLeftMappingChange={onLeftMappingChange}
        onRightMappingChange={onRightMappingChange}
        bindings={bindings}
        deadzone={deadzone}
      />
      <GamepadVisualizer gamepads={gamepads} />
    </main>
  );
}
