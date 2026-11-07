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
}>;

export function Slice({
  config,
  index,
  count,
  highlighted,
  selected = false,
  duplicate = false,
  unassigned = false,
}: SliceProps) {
  const label = sliceLabelPosition(index, count);
  const angle = (index * 2 * Math.PI) / count;
  const pullDistance = selected ? 10 : 0;

  return (
    <g
      className={`dial-slice${highlighted ? " dial-slice--highlighted" : ""}${selected ? " dial-slice--selected" : ""}${duplicate ? " dial-slice--duplicate" : ""}${unassigned ? " dial-slice--unassigned" : ""}`}
      style={{
        transform: `translate(${Math.sin(angle) * pullDistance}px, ${-Math.cos(angle) * pullDistance}px)`,
      }}
      data-slice-id={config.id}
      data-character={config.character}
    >
      <path className="dial-slice__wedge" d={slicePath(index, count)} />
      <text className="dial-slice__label" x={label.x} y={label.y}>
        {config.character}
      </text>
    </g>
  );
}
