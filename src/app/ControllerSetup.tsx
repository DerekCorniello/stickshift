import { useEffect, useMemo, useRef, useState } from "react";
import { actionLabels } from "../typing";
import type { ControlAction, GamepadSnapshot } from "../typing";
import { ControllerHud } from "./ControllerHud";
import type { HudTarget } from "./ControllerHud";
import {
  REST_MS,
  beginCapture,
  sampleButton,
  sampleMappedCircle,
  sampleDirection,
  sampleRest,
} from "./controllerCapture";
import type { CaptureWindow } from "./controllerCapture";
import {
  changedInputs,
  inputName,
  withAxisButtons,
  withButtonAxes,
} from "./controllerSetup";
import type { ControllerProfile } from "./controllerSetup";
import "./controllerSetup.css";
import { ControllerSetupTrace } from "./controllerSetupTrace";

const actions = Object.keys(actionLabels) as ControlAction[];

type GuideStep =
  | Readonly<{
      kind: "button";
      prompt: string;
      visualIndex: number;
      action?: ControlAction;
      target: HudTarget;
    }>
  | Readonly<{
      kind: "direction" | "circle";
      prompt: string;
      side: "left" | "right";
      direction?: "right" | "left" | "up" | "down";
      target: HudTarget;
    }>;

const buttonStep = (
  prompt: string,
  visualIndex: number,
  action?: ControlAction,
): GuideStep => ({
  kind: "button",
  prompt,
  visualIndex,
  action,
  target: { kind: "button", index: visualIndex },
});

const stickStep = (
  kind: "direction" | "circle",
  prompt: string,
  side: "left" | "right",
  direction?: "right" | "left" | "up" | "down",
): GuideStep => ({
  kind,
  prompt,
  side,
  direction,
  target: { kind: "stick", side, direction },
});

export const guideSteps: readonly GuideStep[] = [
  buttonStep(
    "Press the rightmost button on the right side.",
    1,
    "acceptFirstSuggestion",
  ),
  buttonStep("Press the bottom button on the right side.", 0, "enter"),
  buttonStep("Press the leftmost button on the right side.", 2),
  buttonStep("Press the top button on the right side.", 3, "autocomplete"),

  stickStep(
    "direction",
    "Push the left stick right, then release it.",
    "left",
    "right",
  ),
  stickStep(
    "direction",
    "Push the left stick up, then release it.",
    "left",
    "up",
  ),
  stickStep(
    "direction",
    "Push the left stick left, then release it.",
    "left",
    "left",
  ),
  stickStep(
    "direction",
    "Push the left stick down, then release it.",
    "left",
    "down",
  ),
  stickStep("circle", "Make one slow circle with the left stick.", "left"),

  stickStep(
    "direction",
    "Push the right stick right, then release it.",
    "right",
    "right",
  ),
  stickStep(
    "direction",
    "Push the right stick up, then release it.",
    "right",
    "up",
  ),
  stickStep(
    "direction",
    "Push the right stick left, then release it.",
    "right",
    "left",
  ),
  stickStep(
    "direction",
    "Push the right stick down, then release it.",
    "right",
    "down",
  ),
  stickStep("circle", "Make one slow circle with the right stick.", "right"),
  buttonStep("Press up on the D-pad.", 12, "cursorUp"),
  buttonStep("Press down on the D-pad.", 13, "cursorDown"),
  buttonStep("Press left on the D-pad.", 14, "cursorLeft"),
  buttonStep("Press right on the D-pad.", 15, "cursorRight"),
  buttonStep("Press the left shoulder button.", 4, "backspace"),
  buttonStep("Press the right shoulder button.", 5, "space"),
  buttonStep("Pull the left trigger.", 6, "previousLayer"),
  buttonStep("Pull the right trigger.", 7, "nextLayer"),
  buttonStep("Press the left stick down until it clicks.", 10, "commitLeft"),
  buttonStep("Press the right stick down until it clicks.", 11, "commitRight"),
  buttonStep("Press the small button left of center.", 8, "close"),
  buttonStep("Press the small button right of center.", 9, "submit"),
];

type Props = Readonly<{
  pad: GamepadSnapshot;
  initial: ControllerProfile;
  newController: boolean;
  onSave: (profile: ControllerProfile) => void;
  onClose: () => void;
}>;

export function ControllerSetup({
  pad: rawPad,
  initial,
  newController,
  onSave,
  onClose,
}: Props) {
  const pad = useMemo(() => withButtonAxes(rawPad), [rawPad]);
  const [page, setPage] = useState<"check" | "neutral" | "guide" | "review">(
    newController ? "check" : "neutral",
  );
  const [initialSnapshot, setInitialSnapshot] = useState(pad);
  const [measuringRest, setMeasuringRest] = useState(false);
  const [draft, setDraft] = useState({ ...initial, axisRest: [...pad.axes] });
  const [guideIndex, setGuideIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [capture, setCapture] = useState<ControlAction | null>(null);
  const [capturedAxes, setCapturedAxes] = useState<readonly number[]>([]);
  const [discovered, setDiscovered] = useState(initial.discovered);
  const [measurement, setMeasurement] = useState(0);
  const [restingAxes, setRestingAxes] = useState<readonly number[]>(pad.axes);
  const expanded = useMemo(
    () => withAxisButtons(pad, restingAxes),
    [pad, restingAxes],
  );
  const availableAxes = pad.availableAxes ?? pad.axes.map((_, index) => index);
  const captureWindow = useRef<{ key: string; value: CaptureWindow } | null>(
    null,
  );
  const advanceTimer = useRef<number | null>(null);
  const trace = useRef(new ControllerSetupTrace());
  const live = changedInputs(pad, initialSnapshot);
  const liveKey = live.join("|");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDiscovered((current) => [
        ...new Set([...current, ...liveKey.split("|").filter(Boolean)]),
      ]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [liveKey]);
  useEffect(
    () => () => {
      if (advanceTimer.current !== null)
        window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (page === "neutral") {
      if (!measuringRest) return;
      if (captureWindow.current?.key !== "neutral") {
        captureWindow.current = {
          key: "neutral",
          value: beginCapture(pad, Date.now()),
        };
        return;
      }
      const state = captureWindow.current.value;
      const rest = sampleRest(state, pad, Date.now());
      setMeasurement(Math.min(1, (Date.now() - state.stableSince) / REST_MS));
      if (rest) {
        setRestingAxes(rest);
        setInitialSnapshot({ ...pad, axes: rest });
        setDraft((current) => ({ ...current, axisRest: [...rest] }));
        setDiscovered([]);
        setMeasuringRest(false);
        setPage("guide");
        captureWindow.current = null;
      }
      return;
    }
    if (page === "review" && capture) {
      const key = `review:${capture}`;
      if (captureWindow.current?.key !== key) {
        captureWindow.current = {
          key,
          value: beginCapture(
            withAxisButtons(initialSnapshot, restingAxes),
            Date.now(),
          ),
        };
        return;
      }
      const index = sampleButton(
        captureWindow.current.value,
        expanded,
        Date.now(),
      );
      if (index !== null) {
        setDraft((current) => ({
          ...current,
          bindings: { ...current.bindings, [capture]: index },
        }));
        setCapture(null);
      }
      return;
    }
    if (page !== "guide" || feedback) return;
    const currentStep = guideSteps[guideIndex];
    if (!currentStep) return;

    const now = Date.now();
    const key = `guide:${guideIndex}`;
    if (captureWindow.current?.key !== key) {
      captureWindow.current = {
        key,
        value: beginCapture(
          currentStep.kind === "button"
            ? withAxisButtons(initialSnapshot, restingAxes)
            : { ...initialSnapshot, axes: restingAxes },
          now,
        ),
      };
      if (currentStep.kind === "button")
        sampleButton(captureWindow.current.value, expanded, now);
      else sampleDirection(captureWindow.current.value, pad, now);
      setMeasurement(0);
      return;
    }
    const captureState = captureWindow.current.value;

    if (currentStep.kind === "button") {
      const detected = sampleButton(captureState, expanded, now);
      setMeasurement(
        captureState.ready && captureState.candidate !== null
          ? Math.min(1, (now - captureState.candidateSince) / 900)
          : 0,
      );
      if (detected === null) return;
      const index = detected;
      const baseline = {
        ...pad,
        axes: captureState.baselineAxes,
        buttons: pad.buttons.map((_, buttonIndex) => ({
          value: captureState.baselineButtons[buttonIndex] ?? 0,
          pressed: captureState.baselinePressed[buttonIndex] ?? false,
        })),
      };
      const signals = changedInputs(pad, baseline);
      setDraft((current) => {
        const visualButtons = current.visualButtons
          ? [...current.visualButtons]
          : Array.from({ length: 16 }, (_, i) => i);
        const visualSignals = current.visualSignals
          ? current.visualSignals.map((items) => [...items])
          : Array.from({ length: 16 }, () => [] as string[]);
        visualButtons[currentStep.visualIndex] = index;
        visualSignals[currentStep.visualIndex] = signals;
        return {
          ...current,
          visualButtons,
          visualSignals,
          bindings: currentStep.action
            ? { ...current.bindings, [currentStep.action]: index }
            : current.bindings,
        };
      });
      setFeedback(inputName(pad, index));
    } else if (currentStep.kind === "direction") {
      const sideKey =
        currentStep.side === "left" ? "leftMapping" : "rightMapping";
      const horizontal = currentStep.direction === "right";
      const result = sampleDirection(captureState, pad, now);
      setMeasurement(
        captureState.candidate === null
          ? 0
          : Math.min(1, (now - captureState.candidateSince) / 900),
      );
      if (!result) return;
      const field = horizontal ? "xAxis" : "yAxis";
      const centerField = horizontal ? "centerX" : "centerY";
      const rangeField = horizontal ? "rangeX" : "rangeY";
      const invertField = horizontal ? "invertX" : "invertY";
      setDraft((current) => ({
        ...current,
        [sideKey]: {
          ...current[sideKey],
          directions: {
            ...current[sideKey].directions,
            [currentStep.direction!]: result,
          },
          ...(currentStep.direction === "right" ||
          currentStep.direction === "up"
            ? {
                [field]: result.index,
                [centerField]: result.center,
                [rangeField]: result.range,
                [invertField]: horizontal ? result.invert : !result.invert,
              }
            : {}),
        },
      }));
      setCapturedAxes((current) => {
        const next = [...current];
        next[
          currentStep.side === "left"
            ? horizontal
              ? 0
              : 1
            : horizontal
              ? 2
              : 3
        ] = result.index;
        return next;
      });
      setFeedback("direction");
    } else {
      const mapping =
        draft[currentStep.side === "left" ? "leftMapping" : "rightMapping"];
      const complete = sampleMappedCircle(captureState, pad, mapping, now);
      setMeasurement(captureState.visited.size / 4);
      if (!complete) return;
      setFeedback("circle");
    }
    advanceTimer.current = window.setTimeout(() => {
      setFeedback(null);
      if (guideIndex === guideSteps.length - 1) setPage("review");
      else setGuideIndex(guideIndex + 1);
    }, 850);
  }, [
    pad,
    expanded,
    initialSnapshot,
    page,
    capture,
    feedback,
    guideIndex,
    capturedAxes,
    draft,
    restingAxes,
    measuringRest,
  ]);

  useEffect(() => {
    trace.current.record(
      Date.now(),
      page === "guide"
        ? `${guideIndex}: ${guideSteps[guideIndex].prompt}`
        : page,
      rawPad,
      captureWindow.current?.value ?? null,
      feedback,
    );
  }, [rawPad, page, guideIndex, feedback]);

  const downloadReport = () => {
    const report = trace.current.report(rawPad, draft, navigator.userAgent);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "stickshift-setup-report.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sticksReady = [draft.leftMapping, draft.rightMapping].every((mapping) =>
    ["right", "left", "up", "down"].every((direction) => {
      const binding =
        mapping.directions?.[direction as "right" | "left" | "up" | "down"];
      return binding && availableAxes.includes(binding.index);
    }),
  );
  const finish = () => {
    if (!sticksReady) return;
    onSave({
      ...draft,
      accepted: true,
      calibrationVersion: 2,
      discovered: [...new Set([...discovered, ...live])],
    });
  };
  const currentStep = guideSteps[guideIndex];
  const unassigned = actions.filter(
    (action) => draft.bindings[action] === null,
  );
  const bindingCounts = new Map<number, number>();
  for (const index of Object.values(draft.bindings)) {
    if (index !== null)
      bindingCounts.set(index, (bindingCounts.get(index) ?? 0) + 1);
  }
  const duplicates = [...bindingCounts].filter(([, count]) => count > 1);
  const buttonPositions =
    draft.visualButtons ?? Array.from({ length: 16 }, (_, index) => index);
  const mappedButtons = new Set(
    buttonPositions.filter((index): index is number => index !== null),
  );
  const visualDuplicates = [...mappedButtons].filter(
    (index) => buttonPositions.filter((item) => item === index).length > 1,
  );
  const mappedAxes = new Set([
    ...[draft.leftMapping, draft.rightMapping].flatMap((mapping) =>
      Object.values(mapping.directions ?? {}).map((binding) => binding.index),
    ),
    draft.leftMapping.xAxis,
    draft.leftMapping.yAxis,
    draft.rightMapping.xAxis,
    draft.rightMapping.yAxis,
  ]);
  const isUnmatched = (name: string) => {
    if (draft.visualSignals?.some((signals) => signals.includes(name)))
      return false;
    const [kind, number] = name.split(" ");
    const index = Number(number);
    const nativeCount = pad.physicalAxisCount ?? pad.axes.length;
    const buttonCount = pad.buttons.length;
    if (kind === "Axis" && index >= nativeCount) {
      const button = (index - nativeCount) % buttonCount;
      if (
        mappedAxes.has(nativeCount + button) ||
        mappedAxes.has(nativeCount + buttonCount + button)
      )
        return false;
    }
    if (kind === "Button")
      return (
        !mappedButtons.has(index) &&
        !mappedAxes.has(nativeCount + index) &&
        !mappedAxes.has(nativeCount + buttonCount + index)
      );
    const base = Math.max(16, pad.buttons.length);
    const offset = name.endsWith("+") ? 1 : 0;
    return (
      !mappedAxes.has(index) && !mappedButtons.has(base + index * 2 + offset)
    );
  };
  const unmatchedDiscovered = discovered.filter(isUnmatched);

  const skip = () => {
    if (currentStep.kind !== "button") return;
    setDraft((current) => {
      const visualButtons = current.visualButtons
        ? [...current.visualButtons]
        : Array.from({ length: 16 }, (_, i) => i);
      const visualSignals = current.visualSignals
        ? current.visualSignals.map((items) => [...items])
        : Array.from({ length: 16 }, () => [] as string[]);
      visualButtons[currentStep.visualIndex] = null;
      visualSignals[currentStep.visualIndex] = [];
      return {
        ...current,
        visualButtons,
        visualSignals,
        bindings: currentStep.action
          ? { ...current.bindings, [currentStep.action]: null }
          : current.bindings,
      };
    });
    if (guideIndex === guideSteps.length - 1) setPage("review");
    else setGuideIndex(guideIndex + 1);
  };
  const redo = () => {
    setDraft({ ...initial, axisRest: [...initialSnapshot.axes] });
    setGuideIndex(0);
    setCapturedAxes([]);
    setRestingAxes(pad.axes);
    setCapture(null);
    setFeedback(null);
    captureWindow.current = null;
    setMeasurement(0);
    setMeasuringRest(false);
    setPage("neutral");
  };

  return (
    <div className="controller-setup-backdrop">
      <section
        className="controller-setup"
        role="dialog"
        aria-modal="true"
        aria-label="Controller setup"
      >
        <header>
          <div>
            <p className="page-eyebrow">Controller setup</p>
            <h2>
              {page === "check"
                ? "New controller?"
                : page === "guide"
                  ? "Identify each control"
                  : "Check your controls"}
            </h2>
            <p>{pad.id}</p>
          </div>
          {!newController && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close controller setup"
            >
              Close
            </button>
          )}
        </header>

        <details>
          <summary>Setup not working?</summary>
          <p>
            Download a report after trying the control that fails. It includes
            controller readings, setup decisions, and browser information.
            Nothing is uploaded automatically.
          </p>
          <button type="button" onClick={downloadReport}>
            Download setup report
          </button>
        </details>
        {page === "neutral" && (
          <div className="controller-setup__prompt" aria-live="polite">
            <h3>Let the controller rest with no buttons pressed.</h3>
            <p>
              Release both sticks, triggers, and buttons. We will measure their
              resting values before identifying any control.
            </p>
            {measuringRest ? (
              <>
                <p>
                  Keep everything released for two seconds. Movement restarts
                  the measurement.
                </p>
                <progress
                  aria-label="Rest measurement"
                  value={measurement}
                  max={1}
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  captureWindow.current = null;
                  setMeasurement(0);
                  setMeasuringRest(true);
                }}
              >
                Everything is released — measure rest
              </button>
            )}
          </div>
        )}
        {page === "guide" && (
          <div className="controller-setup__progress">
            <span>
              Step {guideIndex + 1} of {guideSteps.length}
            </span>
            <progress value={guideIndex + 1} max={guideSteps.length} />
          </div>
        )}
        {page === "guide" && (
          <div
            className="controller-setup__prompt"
            key={guideIndex}
            aria-live="polite"
          >
            <span>Do this on your controller</span>
            <h3>{currentStep.prompt}</h3>
            <p>
              {feedback
                ? "Control captured. Moving to the next control..."
                : currentStep.kind === "direction"
                  ? "Hold it in that direction for about one second, then release."
                  : currentStep.kind === "circle"
                    ? "Complete a full circle over about two seconds to check both axes."
                    : "Hold this control for about one second so we can confirm it."}
            </p>
            <div
              className="controller-setup__meter"
              role="progressbar"
              aria-label="Input measurement"
              aria-valuenow={Math.round(measurement * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${measurement * 100}%` }} />
            </div>
          </div>
        )}
        <ControllerHud
          pad={expanded}
          leftMapping={draft.leftMapping}
          rightMapping={draft.rightMapping}
          bindings={draft.bindings}
          visualButtons={draft.visualButtons}
          target={page === "guide" ? currentStep.target : null}
          targetComplete={Boolean(feedback)}
          compact
          instructionOnly={page !== "review"}
          unmappedSticks={
            page === "guide"
              ? capturedAxes.length < 2
                ? ["left", "right"]
                : capturedAxes.length < 4
                  ? ["right"]
                  : []
              : []
          }
        />

        {page === "check" && (
          <>
            <p>
              Set up will first measure the controller at rest, then identify
              each control and verify the stick directions.
            </p>
            <div className="controller-setup__actions">
              <button type="button" onClick={() => setPage("neutral")}>
                Set up
              </button>
            </div>
          </>
        )}
        {page === "guide" && (
          <div className="controller-setup__actions">
            <button
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => {
                captureWindow.current = null;
                if (guideIndex > 0) setGuideIndex(guideIndex - 1);
                else if (newController) setPage("check");
                else onClose();
              }}
            >
              Back
            </button>
            {currentStep.kind === "button" && (
              <button type="button" disabled={Boolean(feedback)} onClick={skip}>
                Skip this control
              </button>
            )}
          </div>
        )}
        {page === "review" && (
          <>
            <div className="controller-setup__verification">
              <h3>Do the controls look right now?</h3>
              <p>
                Move both sticks and press a few buttons. Watch the controller
                above and check that each control lights up where you expect.
                Check every control before saving.
              </p>
              {(unassigned.length > 0 || duplicates.length > 0) && (
                <p
                  className="controller-setup__verification-note"
                  role="status"
                >
                  {unassigned.length > 0 &&
                    `${unassigned.length} actions unassigned. `}
                  {duplicates.length > 0 &&
                    `${duplicates.length} inputs assigned more than once. `}
                  You can fix these under Edit individual controls.
                </p>
              )}
              {unmatchedDiscovered.length > 0 && (
                <p className="controller-setup__verification-note" role="alert">
                  These inputs changed during setup but have no position on the
                  diagram: {unmatchedDiscovered.join(", ")}. Check them before
                  saving or redo setup.
                </p>
              )}
              {visualDuplicates.length > 0 && (
                <p className="controller-setup__verification-note" role="alert">
                  The same input is shown in more than one position:{" "}
                  {visualDuplicates
                    .map((index) => `Button ${index}`)
                    .join(", ")}
                  . Redo those controls before saving.
                </p>
              )}
              <div className="controller-setup__actions">
                <button type="button" onClick={redo}>
                  Redo setup
                </button>
                <button type="button" onClick={finish} disabled={!sticksReady}>
                  Good, save controller
                </button>
              </div>
            </div>
            <details className="controller-setup__review-details">
              <summary>Edit individual controls</summary>
              <p>
                Relearn a stick or capture an action again. Extra inputs remain
                available here when you reopen setup.
              </p>
              <div className="controller-setup__sticks">
                {(["left", "right"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      captureWindow.current = null;
                      setFeedback(null);
                      setGuideIndex(
                        guideSteps.findIndex(
                          (step) =>
                            step.kind === "direction" && step.side === side,
                        ),
                      );
                      setPage("guide");
                    }}
                  >
                    Relearn {side} stick directions
                  </button>
                ))}
              </div>
              {!sticksReady && (
                <p role="alert">
                  Capture all four directions for each stick before saving.
                </p>
              )}
              <div className="controller-setup__bindings">
                {actions.map((action) => (
                  <div key={action}>
                    <span>{actionLabels[action]}</span>
                    <span>
                      {draft.bindings[action] === null
                        ? "Unassigned"
                        : inputName(pad, draft.bindings[action]!)}
                    </span>
                    <button type="button" onClick={() => setCapture(action)}>
                      {capture === action ? "Press a control..." : "Capture"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          bindings: { ...current.bindings, [action]: null },
                        }))
                      }
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
              {unassigned.length > 0 && (
                <p role="status">
                  Unassigned actions:{" "}
                  {unassigned.map((action) => actionLabels[action]).join(", ")}
                </p>
              )}
              {duplicates.length > 0 && (
                <p role="status">
                  Inputs assigned more than once:{" "}
                  {duplicates
                    .map(([index]) => inputName(pad, index))
                    .join(", ")}
                </p>
              )}
              <details className="controller-setup__inventory">
                <summary>
                  All exposed inputs ({pad.axes.length} axes,{" "}
                  {pad.buttons.length} buttons)
                </summary>
                <p>Detected: {discovered.join(", ") || "None yet"}</p>
                <div className="controller-setup__buttons">
                  {pad.buttons.map((button, index) => (
                    <span
                      key={index}
                      className={
                        button.pressed || button.value >= 0.55
                          ? "is-active"
                          : ""
                      }
                    >
                      B{index}
                    </span>
                  ))}
                </div>
              </details>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
