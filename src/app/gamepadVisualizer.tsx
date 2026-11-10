import type { GamepadSnapshot } from "../typing";
import { GamepadButtonLabel } from "./GamepadButtonLabel";
import { getControllerAxisName, getControllerInfo } from "./gamepadLabels";
import "./gamepadVisualizer.css";

type GamepadVisualizerProps = Readonly<{
  gamepads: Readonly<Record<number, GamepadSnapshot>>;
}>;

export default function GamepadVisualizer({
  gamepads,
}: GamepadVisualizerProps) {
  const gamepadsArray = Object.values(gamepads);

  return (
    <section className="gamepad-visualizer" aria-label="Raw gamepad inputs">
      <h2>Raw inputs</h2>
      {gamepadsArray.length === 0 ? (
        <p>Connect a controller and press a button to see its inputs.</p>
      ) : (
        gamepadsArray.map((pad) => (
          <section className="gamepad-visualizer__pad" key={pad.index}>
            <div className="gamepad-visualizer__info">
              <strong>{getControllerInfo(pad.id).name}</strong>
              <span> (Gamepad {pad.index})</span>
              <div className="gamepad-visualizer__raw-id">{pad.id}</div>
            </div>

            <div className="gamepad-visualizer__grid">
              <div>
                <h3>Axes</h3>
                <div className="gamepad-visualizer__axes">
                  {Array.from({ length: Math.floor(pad.axes.length / 2) }).map(
                    (_, index) => {
                      const x = pad.axes[index * 2];
                      const y = pad.axes[index * 2 + 1];
                      return (
                        <div className="gamepad-visualizer__axis" key={index}>
                          <span>
                            {getControllerAxisName(pad.id, index * 2)} /{" "}
                            {getControllerAxisName(pad.id, index * 2 + 1)}
                          </span>
                          <svg
                            className="gamepad-visualizer__plot gamepad-visualizer__plot--axis"
                            viewBox="-2.2 -2.2 4.4 4.4"
                            aria-label={`Axis ${index * 2}: ${x.toFixed(2)}, axis ${index * 2 + 1}: ${y.toFixed(2)}`}
                            role="img"
                          >
                            <circle
                              className="gamepad-visualizer__frame"
                              cx="0"
                              cy="0"
                              r="2"
                            />
                            <path
                              className="gamepad-visualizer__crosshair"
                              d="M0,-2L0,2M-2,0L2,0"
                            />
                            <circle
                              className="gamepad-visualizer__point"
                              cx={x * 2}
                              cy={y * 2}
                              r="0.25"
                            />
                            <text
                              className="gamepad-visualizer__axis-value"
                              textAnchor="middle"
                              x="0"
                              y="2"
                            >
                              {x.toFixed(2)},{y.toFixed(2)}
                            </text>
                          </svg>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
              <div>
                <h3>Buttons</h3>
                <div className="gamepad-visualizer__buttons">
                  {pad.buttons.map((button, index) => (
                    <div className="gamepad-visualizer__button" key={index}>
                      <svg
                        className="gamepad-visualizer__plot gamepad-visualizer__plot--button"
                        viewBox="-2.2 -2.2 4.4 4.4"
                        aria-hidden="true"
                      >
                        <circle
                          className="gamepad-visualizer__frame"
                          cx="0"
                          cy="0"
                          r="2"
                        />
                        <circle
                          className={`gamepad-visualizer__meter${button.pressed ? " is-pressed" : ""}`}
                          cx="0"
                          cy="0"
                          r={button.value * 2}
                        />
                        <text
                          className="gamepad-visualizer__button-value"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          x="0"
                          y="0"
                        >
                          {button.value.toFixed(2)}
                        </text>
                      </svg>
                      <GamepadButtonLabel
                        gamepadId={pad.id}
                        buttonIndex={index}
                        pad={pad}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))
      )}
    </section>
  );
}
