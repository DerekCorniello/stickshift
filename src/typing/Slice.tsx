import { sliceLabelPosition, slicePath } from "./geometry";
import type { SliceConfig } from "./types";

type SliceProps = Readonly<{
  config: SliceConfig;
  index: number;
  count: number;
  highlighted: boolean;
  selected?: boolean;
  duplicate?: boolean;
  unassigned?: boolean;
  showWedge?: boolean;
  showLabel?: boolean;
}>;

export function Slice({
  config,
  index,
  count,
  highlighted,
  selected = false,
  duplicate = false,
  unassigned = false,
  showWedge = true,
  showLabel = true,
}: SliceProps) {
  const label = sliceLabelPosition(index, count);
  const angle = (index * 2 * Math.PI) / count;
  const pullDistance = selected ? 10 : 0;
  const classPrefix = showLabel ? "dial-slice" : "dial-wedge";
  const groupClass = [
    classPrefix,
    highlighted ? classPrefix + "--highlighted" : "",
    selected ? classPrefix + "--selected" : "",
    duplicate ? classPrefix + "--duplicate" : "",
    unassigned ? classPrefix + "--unassigned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      className={groupClass}
      style={{
        transform: `translate(${Math.sin(angle) * pullDistance}px, ${-Math.cos(angle) * pullDistance}px)`,
      }}
      data-slice-id={config.id}
      data-character={config.character}
    >
      {showWedge && (
        <path className="dial-slice__wedge" d={slicePath(index, count)} />
      )}
      {showLabel && (
        <text className="dial-slice__label" x={label.x} y={label.y}>
          {config.character}
        </text>
      )}
    </g>
  );
}
