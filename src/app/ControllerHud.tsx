import { defaultBindings } from "../typing";
import type { ButtonBindings, ControlAction, GamepadSnapshot } from "../typing";
import { readStickPosition } from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import "./controllerHud.css";

export type HudTarget =
  | Readonly<{ kind: "button"; index: number }>
  | Readonly<{
      kind: "stick";
      side: "left" | "right";
      direction?: "right" | "left" | "up" | "down";
    }>;

type Props = Readonly<{
  pad: GamepadSnapshot;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  bindings?: ButtonBindings;
  visualButtons?: readonly (number | null)[];
  target?: HudTarget | null;
  targetComplete?: boolean;
  compact?: boolean;
  instructionOnly?: boolean;
  unmappedSticks?: readonly ("left" | "right")[];
}>;

const buttonPoints = [
  [1407, 938],
  [1513, 838],
  [1303, 838],
  [1407, 729],
  [615, 586],
  [1440, 586],
  [565, 539],
  [1490, 539],
  [924, 836],
  [1137, 836],
  [655, 838],
  [1212, 1124],
] as const;

const stickPoints = { left: [655, 838], right: [1212, 1124] } as const;

function ControlShape({
  index,
  className,
}: {
  index: number;
  className: string;
}) {
  if (index >= 12) {
    const boxes = [
      [803, 1005],
      [803, 1147],
      [725, 1083],
      [867, 1083],
    ];
    const [x, y] = boxes[index - 12];
    return (
      <rect
        className={className}
        x={x}
        y={y}
        width={index < 14 ? 63 : 77}
        height={index < 14 ? 77 : 63}
      />
    );
  }
  if (index >= 4 && index <= 7) {
    const paths = [
      "M502 656 Q520 606 558 595 L721 610 Q753 603 792 657 L821 587 L845 574 Q700 516 558 595 Z",
      "M1553 656 Q1535 606 1497 595 L1334 610 Q1302 603 1263 657 L1234 587 L1210 574 Q1355 516 1497 595 Z",
      "M520 626 Q545 556 627 537 L647 561 Q565 595 520 626 Z",
      "M1535 626 Q1510 556 1428 537 L1408 561 Q1490 595 1535 626 Z",
    ];
    return <path className={className} d={paths[index - 4]} />;
  }
  const [cx, cy] = buttonPoints[index];
  const radius = index < 4 ? 49 : index < 10 ? 36 : 76;
  return <circle className={className} cx={cx} cy={cy} r={radius} />;
}

export function ControllerHud({
  pad,
  leftMapping,
  rightMapping,
  bindings = defaultBindings,
  visualButtons,
  target = null,
  targetComplete = false,
  compact = false,
  instructionOnly = false,
  unmappedSticks = [],
}: Props) {
  const left = readStickPosition(pad.axes, leftMapping);
  const right = readStickPosition(pad.axes, rightMapping);
  return (
    <section
      className={`controller-hud${compact ? " controller-hud--compact" : ""}`}
      aria-label="Live controller HUD"
    >
      <div className="controller-hud__stage">
        <svg
          viewBox="280 500 1500 1160"
          role="img"
          aria-label="Controller diagram with live button and stick highlights"
        >
          <defs>
            <marker
              id="stick-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill="var(--accent)" />
            </marker>
          </defs>
          <image
            href={`${import.meta.env.BASE_URL}assets/img/gamepads/controller-wireframe.svg`}
            x="0"
            y="0"
            width="2048"
            height="2048"
            className="controller-hud__art"
          />
          {!instructionOnly &&
            Array.from({ length: 16 }, (_, index) => {
              const action = (
                Object.keys(defaultBindings) as ControlAction[]
              ).find((name) => defaultBindings[name] === index);
              const source = visualButtons
                ? visualButtons[index]
                : action
                  ? bindings[action]
                  : index;
              const button = source == null ? undefined : pad.buttons[source];
              const active = button?.pressed || (button?.value ?? 0) >= 0.55;
              return (
                <ControlShape
                  key={index}
                  index={index}
                  className={`controller-hud__button${active ? " is-active" : ""}`}
                />
              );
            })}
          {!instructionOnly &&
            (["left", "right"] as const).map((side) => {
              if (unmappedSticks.includes(side)) return null;
              const [x, y] = stickPoints[side];
              const position = side === "left" ? left : right;
              return (
                <circle
                  key={side}
                  cx={x + position.x * 45}
                  cy={y + position.y * 45}
                  r="27"
                  className={`controller-hud__stick${Math.hypot(position.x, position.y) > 0.2 ? " is-active" : ""}`}
                />
              );
            })}
          {target?.kind === "button" && (
            <ControlShape
              index={target.index}
              className={`controller-hud__target${targetComplete ? " is-complete" : ""}`}
            />
          )}
          {target?.kind === "stick" && target.direction && (
            <g
              className={`controller-hud__orbit${targetComplete ? " is-complete" : ""}`}
            >
              <line
                x1={stickPoints[target.side][0]}
                y1={stickPoints[target.side][1]}
                x2={
                  stickPoints[target.side][0] +
                  (target.direction === "right"
                    ? 85
                    : target.direction === "left"
                      ? -85
                      : 0)
                }
                y2={
                  stickPoints[target.side][1] -
                  (target.direction === "up"
                    ? 85
                    : target.direction === "down"
                      ? -85
                      : 0)
                }
                markerEnd="url(#stick-arrow)"
              />
            </g>
          )}
          {target?.kind === "stick" && !target.direction && (
            <g
              className={`controller-hud__orbit${targetComplete ? " is-complete" : ""}`}
            >
              <circle
                cx={stickPoints[target.side][0]}
                cy={stickPoints[target.side][1]}
                r="70"
              />
              <circle
                className="controller-hud__orbit-dot"
                cx={stickPoints[target.side][0] + 70}
                cy={stickPoints[target.side][1]}
                r="18"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${stickPoints[target.side][0]} ${stickPoints[target.side][1]}`}
                  to={`360 ${stickPoints[target.side][0]} ${stickPoints[target.side][1]}`}
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
