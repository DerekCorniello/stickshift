import type { StickPosition } from "./types";

export function highlightedSliceIndex(
  position: StickPosition,
  deadzone: number,
  sliceCount: number,
): number | null {
  if (sliceCount < 1 || !Number.isInteger(sliceCount)) {
    throw new RangeError("A layer must contain at least one slice");
  }

  if (Math.hypot(position.x, position.y) <= deadzone) {
    return null;
  }

  const sweep = (2 * Math.PI) / sliceCount;
  const angle =
    (Math.atan2(position.x, -position.y) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor((angle + sweep / 2) / sweep) % sliceCount;
}

export function stableSliceIndex(
  position: StickPosition,
  deadzone: number,
  sliceCount: number,
  currentIndex: number | null,
): number | null {
  const candidateIndex = highlightedSliceIndex(position, deadzone, sliceCount);
  if (candidateIndex === null || currentIndex === null) {
    return candidateIndex;
  }

  if (candidateIndex === currentIndex) {
    return currentIndex;
  }

  const sweep = (2 * Math.PI) / sliceCount;
  const angle =
    (Math.atan2(position.x, -position.y) + 2 * Math.PI) % (2 * Math.PI);
  const currentCenter = (currentIndex * 2 * Math.PI) / sliceCount;
  const signedDistance =
    ((angle - currentCenter + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const boundaryWithBuffer = sweep * 0.65;

  return Math.abs(signedDistance) > boundaryWithBuffer
    ? candidateIndex
    : currentIndex;
}

export function slicePath(index: number, sliceCount: number): string {
  const center = 100;
  const innerRadius = 30;
  const outerRadius = 94;
  const sweep = (2 * Math.PI) / sliceCount;
  const start = (index - 0.5) * sweep;
  const end = (index + 0.5) * sweep;
  const point = (radius: number, angle: number): string =>
    `${center + radius * Math.sin(angle)} ${center - radius * Math.cos(angle)}`;

  return [
    `M ${point(outerRadius, start)}`,
    `A ${outerRadius} ${outerRadius} 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(outerRadius, end)}`,
    `L ${point(innerRadius, end)}`,
    `A ${innerRadius} ${innerRadius} 0 ${sweep > Math.PI ? 1 : 0} 0 ${point(innerRadius, start)}`,
    "Z",
  ].join(" ");
}

export function sliceLabelPosition(
  index: number,
  sliceCount: number,
): StickPosition {
  const angle = (index * 2 * Math.PI) / sliceCount;
  return { x: 100 + 63 * Math.sin(angle), y: 100 - 63 * Math.cos(angle) };
}
