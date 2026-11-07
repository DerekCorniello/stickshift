import { useEffect } from "react";
import { highlightedSliceIndex } from "./geometry";
import { Slice } from "./Slice";
import type { LayerConfig, StickPosition } from "./types";

type LayerProps = Readonly<{
  config: LayerConfig;
  position: StickPosition;
  deadzone: number;
  highlightedIndex?: number | null;
  selectedSliceId?: string | null;
  flaggedSliceIds?: ReadonlySet<string>;
  onHighlightChange: (character: string | null) => void;
}>;

export function Layer({
  config,
  position,
  deadzone,
  highlightedIndex: selectedIndex,
  selectedSliceId,
  flaggedSliceIds,
  onHighlightChange,
}: LayerProps) {
  const highlightedIndex =
    selectedIndex === undefined
      ? highlightedSliceIndex(position, deadzone, config.slices.length)
      : selectedIndex;
  const highlightedCharacter =
    highlightedIndex === null
      ? null
      : config.slices[highlightedIndex].character;

  useEffect(() => {
    onHighlightChange(highlightedCharacter);
  }, [highlightedCharacter, onHighlightChange]);

  return (
    <svg
      className="dial-layer"
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${config.id} dial layer`}
      data-layer-id={config.id}
    >
      {config.slices.map((slice, index) => (
        <Slice
          key={slice.id}
          config={slice}
          index={index}
          count={config.slices.length}
          highlighted={index === highlightedIndex}
          selected={slice.id === selectedSliceId}
          duplicate={flaggedSliceIds?.has(slice.id) ?? false}
          unassigned={slice.character.length !== 1}
        />
      ))}
      <circle className="dial-layer__hub" cx="100" cy="100" r="27" />
    </svg>
  );
}
