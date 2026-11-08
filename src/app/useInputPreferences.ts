import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { defaultLeftMapping, defaultRightMapping } from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import type { InputSettings } from "./inputSettings";

type InputPreferences = InputSettings &
  Readonly<{
    leftMapping: AxisMapping;
    rightMapping: AxisMapping;
  }>;

const defaults: InputPreferences = {
  leftMapping: defaultLeftMapping,
  rightMapping: defaultRightMapping,
  deadzone: 0.2,
};

function storageKey(controllerId: string): string {
  return `stickshift.input.v1:${controllerId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAxisMapping(value: unknown): value is AxisMapping {
  return (
    isRecord(value) &&
    typeof value.xAxis === "number" &&
    Number.isSafeInteger(value.xAxis) &&
    value.xAxis >= 0 &&
    typeof value.yAxis === "number" &&
    Number.isSafeInteger(value.yAxis) &&
    value.yAxis >= 0 &&
    typeof value.invertX === "boolean" &&
    typeof value.invertY === "boolean"
  );
}

function isPreferences(value: unknown): value is InputPreferences {
  return (
    isRecord(value) &&
    isAxisMapping(value.leftMapping) &&
    isAxisMapping(value.rightMapping) &&
    typeof value.deadzone === "number" &&
    Number.isFinite(value.deadzone) &&
    value.deadzone > 0 &&
    value.deadzone < 1
  );
}

function loadPreferences(controllerId: string): InputPreferences {
  try {
    const raw = localStorage.getItem(storageKey(controllerId));
    if (raw === null) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (isPreferences(parsed)) return parsed;
    console.warn("Invalid saved controller input preferences; using defaults");
  } catch (error) {
    console.warn("Could not load controller input preferences", error);
  }
  return defaults;
}

export function useInputPreferences(controllerId: string) {
  const [profiles, setProfiles] = useState<
    ReadonlyMap<string, InputPreferences>
  >(() => new Map([[controllerId, loadPreferences(controllerId)]]));
  let preferences = profiles.get(controllerId);
  if (!preferences) {
    preferences = loadPreferences(controllerId);
    setProfiles(new Map(profiles).set(controllerId, preferences));
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey(controllerId),
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.warn("Could not save controller input preferences", error);
    }
  }, [controllerId, preferences]);

  const update = useCallback(
    <K extends keyof InputPreferences>(
      key: K,
      value: SetStateAction<InputPreferences[K]>,
    ) => {
      setProfiles((current) => {
        const profile = current.get(controllerId) ?? defaults;
        const next = {
          ...profile,
          [key]: typeof value === "function" ? value(profile[key]) : value,
        };
        if (!isPreferences(next))
          throw new RangeError("Invalid controller input preference");
        return new Map(current).set(controllerId, next);
      });
    },
    [controllerId],
  );

  const setLeftMapping: Dispatch<SetStateAction<AxisMapping>> = useCallback(
    (value) => update("leftMapping", value),
    [update],
  );
  const setRightMapping: Dispatch<SetStateAction<AxisMapping>> = useCallback(
    (value) => update("rightMapping", value),
    [update],
  );
  const setDeadzone: Dispatch<SetStateAction<number>> = useCallback(
    (value) => update("deadzone", value),
    [update],
  );

  return {
    ...preferences,
    setLeftMapping,
    setRightMapping,
    setDeadzone,
  };
}
