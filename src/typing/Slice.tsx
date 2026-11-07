import { sliceLabelPosition, slicePath } from "./geometry";
import type { SliceConfig } from "./types";

type SliceProps = Readonly<{
  config: SliceConfig;
  index: number;
  count: number;
  highlighted: boolean;
}>;

export function Slice({ config, index, count, highlighted }: SliceProps) {
  const label = sliceLabelPosition(index, count);

  return (
    <g
      className={`dial-slice${highlighted ? " dial-slice--highlighted" : ""}`}
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
