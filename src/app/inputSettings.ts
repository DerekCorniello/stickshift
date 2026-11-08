import { createContext } from "react";

export type InputSettings = Readonly<{
  deadzone: number;
}>;

export const InputSettingsContext = createContext<InputSettings>({
  deadzone: 0.2,
});
