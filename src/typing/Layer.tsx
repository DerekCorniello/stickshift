import { useEffect } from "react";
import { highlightedSliceIndex } from "./geometry";
import { Slice } from "./Slice";
import type { LayerConfig, StickPosition } from "./types";

type LayerProps = Readonly<{
  config: LayerConfig;
  position: StickPosition;
  deadzone: number;
  onHighlightChange: (character: string | null) => void;
}>;

export function Layer({
  config,
  position,
  deadzone,
  onHighlightChange,
}: LayerProps) {
  const highlightedIndex = highlightedSliceIndex(
    position,
    deadzone,
    config.slices.length,
  );
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
        />
      ))}
      <circle className="dial-layer__hub" cx="100" cy="100" r="27" />
    </svg>
  );
}
