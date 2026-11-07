import type { StickPosition } from "../typing";

export type AxisMapping = Readonly<{
  xAxis: number;
  yAxis: number;
  invertX: boolean;
  invertY: boolean;
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
  const x = axes[mapping.xAxis] ?? 0;
  const y = axes[mapping.yAxis] ?? 0;

  return {
    x: mapping.invertX ? -x : x,
    y: mapping.invertY ? -y : y,
  };
}
