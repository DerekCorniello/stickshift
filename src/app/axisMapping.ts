import type { StickPosition } from "../typing";

export type DirectionBinding = Readonly<{
  index: number;
  center: number;
  range: number;
  invert: boolean;
}>;
export type StickDirection = "right" | "left" | "up" | "down";
export type AxisMapping = Readonly<{
  directions?: Partial<Record<StickDirection, DirectionBinding>>;
  xAxis: number;
  yAxis: number;
  invertX: boolean;
  invertY: boolean;
  centerX?: number;
  centerY?: number;
  rangeX?: number;
  rangeY?: number;
}>;

export const defaultLeftMapping: AxisMapping = {
  xAxis: 0,
  yAxis: 1,
  invertX: false,
  invertY: false,
};

export const defaultRightMapping: AxisMapping = {
  xAxis: 2,
  yAxis: 3,
  invertX: false,
  invertY: false,
};

export function readStickPosition(
  axes: readonly number[],
  mapping: AxisMapping,
): StickPosition {
  if (mapping.directions) {
    const amount = (direction: StickDirection) => {
      const binding = mapping.directions?.[direction];
      if (!binding) return 0;
      const delta =
        ((axes[binding.index] ?? binding.center) - binding.center) *
        (binding.invert ? -1 : 1);
      return Math.max(0, Math.min(1, delta / binding.range));
    };
    return {
      x: amount("right") - amount("left"),
      y: amount("down") - amount("up"),
    };
  }
  const rawX = axes[mapping.xAxis] ?? 0;
  const rawY = axes[mapping.yAxis] ?? 0;
  const x =
    mapping.centerX === undefined
      ? rawX
      : (rawX - mapping.centerX) / (mapping.rangeX ?? 1);
  const y =
    mapping.centerY === undefined
      ? rawY
      : (rawY - mapping.centerY) / (mapping.rangeY ?? 1);

  return {
    x: mapping.invertX ? -x : x,
    y: mapping.invertY ? -y : y,
  };
}
