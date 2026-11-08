import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ButtonBindings,
  ControlAction,
  ControllerEvent,
  DialConfig,
  GamepadSnapshot,
} from "../typing";
import { defaultBindings } from "../typing";
import { AutocompleteBar } from "./AutocompleteBar";
import { ControllerDials } from "./ControllerDials";
import type { AxisMapping } from "./axisMapping";
import "./controller.css";

function useButtonRepeat(
  held: boolean,
  enabled: boolean,
  onRepeat: () => void,
) {
  const onRepeatRef = useRef(onRepeat);
  useEffect(() => {
    onRepeatRef.current = onRepeat;
  }, [onRepeat]);

  useEffect(() => {
    if (!held || !enabled) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      onRepeatRef.current();
      interval = setInterval(() => onRepeatRef.current(), 90);
    }, 400);
    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) clearInterval(interval);
    };
  }, [held, enabled]);
}

type ControllerProps = Readonly<{
  pad: GamepadSnapshot;
  value: string;
  onValueChange: (value: string) => void;
  onCharacterInput: (character: string) => void;
  onActionInput: (action: ControlAction) => void;
  onControllerEvent?: (event: ControllerEvent) => void;
  leftConfig?: DialConfig;
  rightConfig?: DialConfig;
  activeLayerId?: string;
  onActiveLayerChange?: (layerId: string) => void;
  leftMapping?: AxisMapping;
  rightMapping?: AxisMapping;
  onLeftMappingChange?: (mapping: AxisMapping) => void;
  onRightMappingChange?: (mapping: AxisMapping) => void;
  bindings?: ButtonBindings;
  deadzone?: number;
  showDiagnostics?: boolean;
  autocompleteEnabled?: boolean;
}>;

export function Controller({
  pad,
  value,
  onValueChange,
  onCharacterInput,
  onActionInput,
  onControllerEvent,
  leftConfig,
  rightConfig,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  onLeftMappingChange,
  onRightMappingChange,
  bindings,
  deadzone,
  showDiagnostics,
  autocompleteEnabled = true,
}: ControllerProps) {
  const [autocompleteRequested, setAutocompleteActive] = useState(false);
  const autocompleteActive = autocompleteEnabled && autocompleteRequested;
  const [suggestions, setSuggestions] = useState<readonly string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const dialsFocusRef = useRef<HTMLDivElement>(null);
  const wasAutocompleteActive = useRef(false);
  const [suppressEnterRepeat, setSuppressEnterRepeat] = useState(false);
  const actionBindings = bindings ?? defaultBindings;
  const buttonHeld = (action: "backspace" | "enter" | "space") => {
    const index = actionBindings[action];
    const button = index === null ? undefined : pad.buttons[index];
    return button?.pressed === true || (button?.value ?? 0) >= 0.5;
  };

  useButtonRepeat(buttonHeld("backspace"), true, () =>
    onActionInput("backspace"),
  );
  useButtonRepeat(
    buttonHeld("enter"),
    !autocompleteActive && !suppressEnterRepeat,
    () => onActionInput("enter"),
  );
  useButtonRepeat(buttonHeld("space"), true, () => onActionInput("space"));

  useEffect(() => {
    if (autocompleteActive) {
      autocompleteInputRef.current?.focus();
    } else if (wasAutocompleteActive.current) {
      dialsFocusRef.current?.focus();
    }
    wasAutocompleteActive.current = autocompleteActive;
  }, [autocompleteActive]);

  const handleSuggestionsChange = useCallback(
    (nextSuggestions: readonly string[]) => {
      setSuggestions(nextSuggestions);
      setSelectedSuggestionIndex(0);
    },
    [],
  );

  const selectSuggestion = (word: string) => {
    onValueChange(`${word} `);
    setAutocompleteActive(false);
  };

  const moveSuggestionSelection = (direction: -1 | 1) => {
    if (suggestions.length === 0) {
      return;
    }
    setSelectedSuggestionIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;
      return (nextIndex + suggestions.length) % suggestions.length;
    });
  };

  const handleControllerEvent = (event: ControllerEvent) => {
    if (
      event.kind === "button" &&
      event.phase === "release" &&
      event.action === "enter"
    ) {
      setSuppressEnterRepeat(false);
    }
    if (event.kind === "button" && event.phase === "press") {
      if (event.action === "acceptFirstSuggestion" && autocompleteEnabled) {
        const firstSuggestion = suggestions[0];
        if (firstSuggestion) selectSuggestion(firstSuggestion);
      } else if (event.action === "autocomplete" && autocompleteEnabled) {
        setAutocompleteActive((active) => !active);
      } else if (event.action === "close") {
        setAutocompleteActive(false);
      } else if (autocompleteActive) {
        if (event.action === "cursorUp" || event.action === "cursorLeft") {
          moveSuggestionSelection(-1);
        } else if (
          event.action === "cursorDown" ||
          event.action === "cursorRight"
        ) {
          moveSuggestionSelection(1);
        } else if (event.action === "enter") {
          setSuppressEnterRepeat(true);
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          if (selectedSuggestion) {
            selectSuggestion(selectedSuggestion);
          }
        }
      }
    }
    onControllerEvent?.(event);
  };

  const handleActionInput = (action: ControlAction) => {
    if (
      autocompleteActive &&
      (action === "cursorUp" ||
        action === "cursorDown" ||
        action === "cursorLeft" ||
        action === "cursorRight" ||
        action === "enter" ||
        action === "autocomplete" ||
        action === "close")
    ) {
      return;
    }
    if (action === "acceptFirstSuggestion") return;
    onActionInput(action);
  };

  return (
    <section className="controller-component" aria-label="Controller input">
      {autocompleteEnabled && (
        <div className="controller-component__autocomplete">
          <AutocompleteBar
            label="Autocomplete"
            value={value}
            onChange={onValueChange}
            onSelect={selectSuggestion}
            readOnly
            inputRef={autocompleteInputRef}
            selectionActive={autocompleteActive}
            selectedSuggestionIndex={selectedSuggestionIndex}
            onSuggestionsChange={handleSuggestionsChange}
          />
        </div>
      )}
      {autocompleteActive && autocompleteEnabled && (
        <p className="controller-component__mode" role="status">
          Keep typing with the sticks. Use the D-pad to choose a suggestion, B
          to accept it, the right face button to accept the first, or X to close
          selection.
        </p>
      )}
      <div
        ref={dialsFocusRef}
        className="controller-component__dials"
        tabIndex={-1}
        aria-label="Controller dials"
      >
        <ControllerDials
          pad={pad}
          leftConfig={leftConfig}
          rightConfig={rightConfig}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
          leftMapping={leftMapping}
          rightMapping={rightMapping}
          onLeftMappingChange={onLeftMappingChange}
          onRightMappingChange={onRightMappingChange}
          bindings={bindings}
          deadzone={deadzone}
          showDiagnostics={showDiagnostics}
          onCharacterInput={onCharacterInput}
          onActionInput={handleActionInput}
          onControllerEvent={handleControllerEvent}
        />
      </div>
    </section>
  );
}
