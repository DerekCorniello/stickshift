import { useState } from "react";
import { Dial, leftDialConfig, rightDialConfig } from "../typing";
import type { GamepadSnapshot } from "./useGamepad";
import {
  defaultLeftMapping,
  defaultRightMapping,
  readStickPosition,
} from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import "./controllerDials.css";

type ControllerDialsProps = Readonly<{ pad: GamepadSnapshot }>;

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

export function ControllerDials({ pad }: ControllerDialsProps) {
  const [activeLayerId, setActiveLayerId] = useState(
    leftDialConfig.layers[0].id,
  );
  const [leftMapping, setLeftMapping] =
    useState<AxisMapping>(defaultLeftMapping);
  const [rightMapping, setRightMapping] =
    useState<AxisMapping>(defaultRightMapping);
  const [leftHighlight, setLeftHighlight] = useState<string | null>(null);
  const [rightHighlight, setRightHighlight] = useState<string | null>(null);

  return (
    <section className="controller-dials" aria-label="Controller dials">
      <header className="controller-dials__header">
        <div>
          <h1>StickShift dials</h1>
          <p>
            Move the sticks to highlight characters. Select axes below if a
            stick uses a raw layout.
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
            position={readStickPosition(pad.axes, leftMapping)}
            deadzone={0.2}
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
            position={readStickPosition(pad.axes, rightMapping)}
            deadzone={0.2}
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
    </section>
  );
}
