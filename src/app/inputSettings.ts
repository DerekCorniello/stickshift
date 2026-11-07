import { createContext } from "react";

export type InputSettings = Readonly<{
  selectionMode: "auto" | "manual";
  deadzone: number;
}>;

export const InputSettingsContext = createContext<InputSettings>({
  selectionMode: "auto",
  deadzone: 0.2,
});
