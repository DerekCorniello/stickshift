import { useState } from "react";
import { stableSliceIndex } from "./geometry";
import type { StickPosition } from "./types";

type Selection = Readonly<{
  layerId: string;
  index: number;
}>;

export function useStableSliceIndex(
  layerId: string,
  position: StickPosition,
  deadzone: number,
  sliceCount: number,
): number | null {
  const [selection, setSelection] = useState<Selection | null>(null);
  const currentIndex = selection?.layerId === layerId ? selection.index : null;
  const nextIndex = stableSliceIndex(
    position,
    deadzone,
    sliceCount,
    currentIndex,
  );

  if (nextIndex === null) {
    if (selection !== null) {
      setSelection(null);
    }
  } else if (selection?.layerId !== layerId || selection.index !== nextIndex) {
    setSelection({ layerId, index: nextIndex });
  }

  return nextIndex;
}
