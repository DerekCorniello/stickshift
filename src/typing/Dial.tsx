import { Layer } from "./Layer";
import type { DialConfig, StickPosition } from "./types";
import "./dial.css";

export type DialProps = Readonly<{
  config: DialConfig;
  activeLayerId: string;
  position: StickPosition;
  deadzone: number;
  highlightedIndex?: number | null;
  showPreview?: boolean;
  selectedSliceId?: string | null;
  flaggedSliceIds?: ReadonlySet<string>;
  onHighlightChange?: (character: string | null) => void;
}>;

export function Dial({
  config,
  activeLayerId,
  position,
  deadzone,
  highlightedIndex,
  showPreview,
  selectedSliceId,
  flaggedSliceIds,
  onHighlightChange,
}: DialProps) {
  const layer = config.layers.find(
    (candidate) => candidate.id === activeLayerId,
  );
  if (!layer) {
    throw new Error(`Dial ${config.id} has no layer ${activeLayerId}`);
  }

  return (
    <div className="dial" data-dial-id={config.id}>
      <Layer
        config={layer}
        position={position}
        deadzone={deadzone}
        highlightedIndex={highlightedIndex}
        showPreview={showPreview}
        selectedSliceId={selectedSliceId}
        flaggedSliceIds={flaggedSliceIds}
        onHighlightChange={onHighlightChange}
      />
    </div>
  );
}
