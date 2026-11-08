import { useEffect } from "react";
import { highlightedSliceIndex } from "./geometry";
import { Slice } from "./Slice";
import type { LayerConfig, StickPosition } from "./types";

const hubRadius = 27;
const lineStartRadius = hubRadius / 2;

type LayerProps = Readonly<{
  config: LayerConfig;
  position: StickPosition;
  deadzone: number;
  highlightedIndex?: number | null;
  showPreview?: boolean;
  selectedSliceId?: string | null;
  flaggedSliceIds?: ReadonlySet<string>;
  onHighlightChange?: (character: string | null) => void;
}>;

export function Layer({
  config,
  position,
  deadzone,
  highlightedIndex: selectedIndex,
  showPreview,
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
  const stickX = 100 + Math.max(-1, Math.min(1, position.x)) * 70;
  const stickY = 100 + Math.max(-1, Math.min(1, position.y)) * 70;
  const stickDistance = Math.hypot(stickX - 100, stickY - 100);
  const lineStartRatio =
    stickDistance > lineStartRadius ? lineStartRadius / stickDistance : 1;
  const renderSlices = (showWedge: boolean, showLabel: boolean) =>
    config.slices.map((slice, index) => (
      <Slice
        key={slice.id + "-" + (showWedge ? "wedge" : "label")}
        config={slice}
        index={index}
        count={config.slices.length}
        highlighted={index === highlightedIndex}
        selected={slice.id === selectedSliceId}
        duplicate={flaggedSliceIds?.has(slice.id) ?? false}
        unassigned={slice.character.length !== 1}
        showWedge={showWedge}
        showLabel={showLabel}
      />
    ));

  useEffect(() => {
    onHighlightChange?.(highlightedCharacter);
  }, [highlightedCharacter, onHighlightChange]);

  return (
    <svg
      className="dial-layer"
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${config.id} dial layer${showPreview && highlightedCharacter ? `, ${highlightedCharacter} highlighted` : ""}`}
      data-layer-id={config.id}
    >
      {renderSlices(true, false)}
      <circle className="dial-layer__hub" cx="100" cy="100" r={hubRadius} />
      {showPreview && highlightedCharacter && (
        <text
          className="dial-layer__preview"
          x="100"
          y="100"
          aria-hidden="true"
        >
          {highlightedCharacter}
        </text>
      )}
      <line
        className="dial-layer__stick-line"
        x1={100 + (stickX - 100) * lineStartRatio}
        y1={100 + (stickY - 100) * lineStartRatio}
        x2={stickX}
        y2={stickY}
        aria-hidden="true"
      />
      <circle
        className="dial-layer__stick-dot"
        cx={stickX}
        cy={stickY}
        r="5"
        aria-hidden="true"
      />
      {renderSlices(false, true)}
    </svg>
  );
}
