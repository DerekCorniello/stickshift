import type { ButtonBindings, GamepadSnapshot } from "../typing";
import type { DialConfig } from "../typing";
import GamepadVisualizer from "./gamepadVisualizer";
import { ControllerDials } from "./ControllerDials";
import type { AxisMapping } from "./axisMapping";
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
  return (
    <main className="page-shell debug-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Debug</p>
          <h1>Controller diagnostics</h1>
          <p>Inspect raw axes, button events, and dial selection behavior.</p>
        </div>
        <span className="connection-badge">{pad.id}</span>
      </header>
      <ControllerDials
        pad={pad}
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
