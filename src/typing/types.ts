export type StickPosition = Readonly<{ x: number; y: number }>;

export type SliceConfig = Readonly<{
  id: string;
  character: string;
}>;

export type LayerConfig = Readonly<{
  id: string;
  slices: readonly SliceConfig[];
}>;

export type DialConfig = Readonly<{
  id: "left" | "right";
  layers: readonly LayerConfig[];
}>;
