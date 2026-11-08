import { useContext, useRef, useState } from "react";
import { InputSettingsContext } from "./inputSettings";
import {
  actionLabels,
  defaultBindings,
  Dial,
  leftDialConfig,
  rightDialConfig,
  useControllerEvents,
} from "../typing";
import type {
  ButtonBindings,
  ControlAction,
  ControllerEvent,
  DialConfig,
  GamepadSnapshot,
} from "../typing";
import { useStableSliceIndex } from "../typing/useStableSliceIndex";
import {
  defaultLeftMapping,
  defaultRightMapping,
  readStickPosition,
} from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import { getControllerButtonName } from "./gamepadLabels";
import "./controllerDials.css";

type ControllerDialsProps = Readonly<{
  pad: GamepadSnapshot;
  leftConfig?: DialConfig;
  rightConfig?: DialConfig;
  activeLayerId?: string;
  onActiveLayerChange?: (layerId: string) => void;
  leftMapping?: AxisMapping;
  rightMapping?: AxisMapping;
  onLeftMappingChange?: (mapping: AxisMapping) => void;
  onRightMappingChange?: (mapping: AxisMapping) => void;
  bindings?: ButtonBindings;
  deadzone?: number;
  showDiagnostics?: boolean;
  onControllerEvent?: (event: ControllerEvent) => void;
  onCharacterInput?: (character: string) => void;
  onActionInput?: (action: ControlAction) => void;
}>;

type AxisControlsProps = Readonly<{
  side: "Left" | "Right";
  axisCount: number;
  mapping: AxisMapping;
  onChange: (mapping: AxisMapping) => void;
}>;

function AxisControls({
  side,
  axisCount,
  mapping,
  onChange,
}: AxisControlsProps) {
  const axisOptions = Array.from({ length: axisCount }, (_, index) => index);
  const id = side.toLowerCase();

  return (
    <fieldset className="axis-controls">
      <legend>{side} stick axes</legend>
      <label htmlFor={`${id}-x-axis`}>X</label>
      <select
        id={`${id}-x-axis`}
        value={mapping.xAxis}
        onChange={(event) =>
          onChange({ ...mapping, xAxis: Number(event.target.value) })
        }
      >
        {axisOptions.map((index) => (
          <option key={index} value={index}>
            Axis {index}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-y-axis`}>Y</label>
      <select
        id={`${id}-y-axis`}
        value={mapping.yAxis}
        onChange={(event) =>
          onChange({ ...mapping, yAxis: Number(event.target.value) })
        }
      >
        {axisOptions.map((index) => (
          <option key={index} value={index}>
            Axis {index}
          </option>
        ))}
      </select>
      <label className="axis-controls__invert">
        <input
          type="checkbox"
          checked={mapping.invertX}
          onChange={(event) =>
            onChange({ ...mapping, invertX: event.target.checked })
          }
        />
        Flip X
      </label>
      <label className="axis-controls__invert">
        <input
          type="checkbox"
          checked={mapping.invertY}
          onChange={(event) =>
            onChange({ ...mapping, invertY: event.target.checked })
          }
        />
        Flip Y
      </label>
    </fieldset>
  );
}

function describeEvent(event: ControllerEvent, gamepadId: string): string {
  if (event.kind === "button") {
    const action = event.action ? actionLabels[event.action] : "Unassigned";
    const button = getControllerButtonName(gamepadId, event.buttonIndex);
    return `${button} (${event.buttonIndex}) ${event.phase}: ${action}`;
  }
  if (event.kind === "character") {
    const side = event.side === "left" ? "Left" : "Right";
    return `${side} stick would type ${JSON.stringify(event.character)} (${event.layerId})`;
  }
  return `${event.side} stick ${event.phase}`;
}

export function ControllerDials({
  pad,
  leftConfig = leftDialConfig,
  rightConfig = rightDialConfig,
  activeLayerId: externalLayerId,
  onActiveLayerChange,
  leftMapping: externalLeftMapping,
  rightMapping: externalRightMapping,
  onLeftMappingChange,
  onRightMappingChange,
  bindings = defaultBindings,
  deadzone: externalDeadzone,
  showDiagnostics = true,
  onControllerEvent,
  onCharacterInput,
  onActionInput,
}: ControllerDialsProps) {
  const settings = useContext(InputSettingsContext);
  const deadzone = externalDeadzone ?? settings.deadzone;
  const cancelled = useRef({ left: false, right: false });
  const [cancelledSides, setCancelledSides] = useState({
    left: false,
    right: false,
  });
  const [localLayerId, setLocalLayerId] = useState(leftConfig.layers[0].id);
  const [localLeftMapping, setLocalLeftMapping] =
    useState<AxisMapping>(defaultLeftMapping);
  const [localRightMapping, setLocalRightMapping] =
    useState<AxisMapping>(defaultRightMapping);
  const activeLayerId = externalLayerId ?? localLayerId;
  const leftMapping = externalLeftMapping ?? localLeftMapping;
  const rightMapping = externalRightMapping ?? localRightMapping;
  const updateLayer = onActiveLayerChange ?? setLocalLayerId;
  const updateLeftMapping = onLeftMappingChange ?? setLocalLeftMapping;
  const updateRightMapping = onRightMappingChange ?? setLocalRightMapping;
  const [recentEvents, setRecentEvents] = useState<readonly string[]>([]);
  const leftPosition = readStickPosition(pad.axes, leftMapping);
  const rightPosition = readStickPosition(pad.axes, rightMapping);
  const layers = leftConfig.layers;
  const leftLayer = leftConfig.layers.find(
    (layer) => layer.id === activeLayerId,
  );
  const rightLayer = rightConfig.layers.find(
    (layer) => layer.id === activeLayerId,
  );
  if (!leftLayer || !rightLayer) {
    throw new Error(`Both dials must define layer ${activeLayerId}`);
  }

  const leftSelectedIndex = useStableSliceIndex(
    activeLayerId,
    leftPosition,
    deadzone,
    leftLayer.slices.length,
  );
  const rightSelectedIndex = useStableSliceIndex(
    activeLayerId,
    rightPosition,
    deadzone,
    rightLayer.slices.length,
  );

  const changeLayer = (step: number) => {
    const index = layers.findIndex((layer) => layer.id === activeLayerId);
    updateLayer(layers[(index + step + layers.length) % layers.length].id);
  };

  const vibrateOnSelection = () => {
    const gamepad = navigator.getGamepads?.()[pad.index];
    const actuator = gamepad?.vibrationActuator;

    if (!actuator) {
      return;
    }

    void actuator
      .playEffect("dual-rumble", {
        duration: 150,
        strongMagnitude: 0.5,
        weakMagnitude: 0.5,
      })
      .catch((err) => {
        console.error("Vibration playEffect rejected by browser:", err);
      });
  };

  const reportEvent = (event: ControllerEvent) => {
    onControllerEvent?.(event);
    if (event.kind === "character") {
      vibrateOnSelection();
      onCharacterInput?.(event.character);
    } else if (
      event.kind === "button" &&
      event.phase === "press" &&
      event.action
    ) {
      onActionInput?.(event.action);
    }
  };

  useControllerEvents(
    pad,
    bindings,
    leftPosition,
    rightPosition,
    deadzone,
    (event) => {
      if (event.kind === "stick" && event.phase === "enter") {
        cancelled.current[event.side] = false;
        setCancelledSides((current) => ({ ...current, [event.side]: false }));
      }
      if (event.kind === "character" && cancelled.current[event.side]) return;
      reportEvent(event);
      setRecentEvents((current) =>
        [describeEvent(event, pad.id), ...current].slice(0, 8),
      );
      if (event.kind !== "button" || event.phase !== "press") {
        return;
      }
      if (event.action === "commitLeft" || event.action === "commitRight") {
        const side = event.action === "commitLeft" ? "left" : "right";
        const index = side === "left" ? leftSelectedIndex : rightSelectedIndex;
        if (index !== null) {
          cancelled.current[side] = true;
          setCancelledSides((current) => ({ ...current, [side]: true }));
        }
        return;
      }
      if (event.action === "previousLayer") {
        changeLayer(-1);
      } else if (event.action === "nextLayer") {
        changeLayer(1);
      }
    },
    (side) => {
      const layer = side === "left" ? leftLayer : rightLayer;
      const index = side === "left" ? leftSelectedIndex : rightSelectedIndex;
      return index === null
        ? null
        : { character: layer.slices[index].character, layerId: layer.id };
    },
  );

  return (
    <section className="controller-dials" aria-label="Controller dials">
      <header className="controller-dials__header">
        <div>
          <h1>StickShift dials</h1>
          <p>
            Aim with either stick and return it to center to enter its
            character. Click the stick to cancel the current selection. Triggers
            change layers.
          </p>
        </div>
        <span className="controller-dials__mapping">
          {pad.mapping || "Raw mapping"}
        </span>
      </header>

      <div className="controller-dials__layers" aria-label="Layer">
        {leftConfig.layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            aria-pressed={activeLayerId === layer.id}
            onClick={() => updateLayer(layer.id)}
          >
            {layer.id === "numbers-symbols" ? "Numbers + symbols" : layer.id}
          </button>
        ))}
      </div>

      <div className="controller-dials__grid">
        <div className="controller-dials__card">
          <div className="controller-dials__card-header">
            <h2>Left stick</h2>
          </div>
          <Dial
            config={leftConfig}
            activeLayerId={activeLayerId}
            position={leftPosition}
            deadzone={deadzone}
            highlightedIndex={cancelledSides.left ? null : leftSelectedIndex}
            showPreview
          />
          {showDiagnostics && (
            <AxisControls
              side="Left"
              axisCount={pad.axes.length}
              mapping={leftMapping}
              onChange={updateLeftMapping}
            />
          )}
        </div>
        <div className="controller-dials__card">
          <div className="controller-dials__card-header">
            <h2>Right stick</h2>
          </div>
          <Dial
            config={rightConfig}
            activeLayerId={activeLayerId}
            position={rightPosition}
            deadzone={deadzone}
            highlightedIndex={cancelledSides.right ? null : rightSelectedIndex}
            showPreview
          />
          {showDiagnostics && (
            <AxisControls
              side="Right"
              axisCount={pad.axes.length}
              mapping={rightMapping}
              onChange={updateRightMapping}
            />
          )}
        </div>
      </div>
      {showDiagnostics && (
        <section
          className="controller-dials__events"
          aria-label="Controller events"
        >
          <h2>Recent controller events</h2>
          {recentEvents.length === 0 ? (
            <p>Move a stick or press a button to see its event.</p>
          ) : (
            <ol aria-live="polite">
              {recentEvents.map((event, index) => (
                <li key={`${index}-${event}`}>{event}</li>
              ))}
            </ol>
          )}
        </section>
      )}
    </section>
  );
}
