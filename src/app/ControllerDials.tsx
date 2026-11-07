import { useState } from "react";
import {
  actionLabels,
  defaultBindings,
  Dial,
  leftDialConfig,
  rightDialConfig,
  useControllerEvents,
} from "../typing";
import type {
  ControlAction,
  ControllerEvent,
  GamepadSnapshot,
} from "../typing";
import { useStableSliceIndex } from "../typing/useStableSliceIndex";
import {
  defaultLeftMapping,
  defaultRightMapping,
  readStickPosition,
} from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import "./controllerDials.css";

type ControllerDialsProps = Readonly<{
  pad: GamepadSnapshot;
  onCharacterInput?: (character: string) => void;
  onActionInput?: (action: ControlAction) => void;
}>;
const deadzone = 0.2;

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

function describeEvent(event: ControllerEvent): string {
  if (event.kind === "button") {
    const action = event.action ? actionLabels[event.action] : "Unassigned";
    return `Button ${event.buttonIndex} ${event.phase}: ${action}`;
  }
  if (event.kind === "character") {
    const side = event.side === "left" ? "Left" : "Right";
    return `${side} stick would type ${JSON.stringify(event.character)} (${event.layerId})`;
  }
  return `${event.side} stick ${event.phase}`;
}

export function ControllerDials({
  pad,
  onCharacterInput,
  onActionInput,
}: ControllerDialsProps) {
  const [activeLayerId, setActiveLayerId] = useState(
    leftDialConfig.layers[0].id,
  );
  const [leftMapping, setLeftMapping] =
    useState<AxisMapping>(defaultLeftMapping);
  const [rightMapping, setRightMapping] =
    useState<AxisMapping>(defaultRightMapping);
  const [leftHighlight, setLeftHighlight] = useState<string | null>(null);
  const [rightHighlight, setRightHighlight] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<readonly string[]>([]);
  const leftPosition = readStickPosition(pad.axes, leftMapping);
  const rightPosition = readStickPosition(pad.axes, rightMapping);
  const layers = leftDialConfig.layers;
  const leftLayer = leftDialConfig.layers.find(
    (layer) => layer.id === activeLayerId,
  );
  const rightLayer = rightDialConfig.layers.find(
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
    setActiveLayerId((current) => {
      const index = layers.findIndex((layer) => layer.id === current);
      return layers[(index + step + layers.length) % layers.length].id;
    });
  };

  useControllerEvents(
    pad,
    defaultBindings,
    leftPosition,
    rightPosition,
    deadzone,
    (event) => {
      setRecentEvents((current) =>
        [describeEvent(event), ...current].slice(0, 8),
      );
      if (event.kind === "character") {
        onCharacterInput?.(event.character);
        return;
      }
      if (event.kind !== "button" || event.phase !== "press") {
        return;
      }
      if (event.action === "previousLayer") {
        changeLayer(-1);
      } else if (event.action === "nextLayer") {
        changeLayer(1);
      }
      if (event.action) {
        onActionInput?.(event.action);
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
            Move the sticks to identify characters. The triggers change layers;
            other buttons report their actions below.
          </p>
        </div>
        <span className="controller-dials__mapping">
          {pad.mapping || "Raw mapping"}
        </span>
      </header>

      <div className="controller-dials__layers" aria-label="Layer">
        {leftDialConfig.layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            aria-pressed={activeLayerId === layer.id}
            onClick={() => setActiveLayerId(layer.id)}
          >
            {layer.id === "numbers-symbols" ? "Numbers + symbols" : layer.id}
          </button>
        ))}
      </div>

      <div className="controller-dials__grid">
        <div className="controller-dials__card">
          <div className="controller-dials__card-header">
            <h2>Left stick</h2>
            <output aria-label="Left highlighted character">
              {leftHighlight ?? "-"}
            </output>
          </div>
          <Dial
            config={leftDialConfig}
            activeLayerId={activeLayerId}
            position={leftPosition}
            deadzone={deadzone}
            highlightedIndex={leftSelectedIndex}
            onHighlightChange={setLeftHighlight}
          />
          <AxisControls
            side="Left"
            axisCount={pad.axes.length}
            mapping={leftMapping}
            onChange={setLeftMapping}
          />
        </div>
        <div className="controller-dials__card">
          <div className="controller-dials__card-header">
            <h2>Right stick</h2>
            <output aria-label="Right highlighted character">
              {rightHighlight ?? "-"}
            </output>
          </div>
          <Dial
            config={rightDialConfig}
            activeLayerId={activeLayerId}
            position={rightPosition}
            deadzone={deadzone}
            highlightedIndex={rightSelectedIndex}
            onHighlightChange={setRightHighlight}
          />
          <AxisControls
            side="Right"
            axisCount={pad.axes.length}
            mapping={rightMapping}
            onChange={setRightMapping}
          />
        </div>
      </div>
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
    </section>
  );
}
