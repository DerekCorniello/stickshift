import { useEffect, useRef, useState } from "react";
import {
  actionLabels,
  defaultBindings,
  Dial,
  useControllerEvents,
} from "../typing";
import type { ButtonBindings, ControlAction, GamepadSnapshot } from "../typing";
import { GamepadButtonLabel } from "./GamepadButtonLabel";
import { getControllerButtonName } from "./gamepadLabels";
import { inputName } from "./controllerSetup";
import { highlightedSliceIndex } from "../typing/geometry";
import { readStickPosition } from "./axisMapping";
import type { AxisMapping } from "./axisMapping";
import {
  addLayer,
  changeLayerOrder,
  duplicateSliceIds,
  layoutWarnings,
  moveSlice,
  nextConfigId,
  removeLayer,
  updateSlices,
} from "./configModel";
import type { DialSide, Layout } from "./configModel";
import "./pages.css";
import "./configPage.css";

const keyGroups = [
  "qwertyuiopasdfghjklzxcvbnm".split(""),
  "QWERTYUIOPASDFGHJKLZXCVBNM".split(""),
  "1234567890!@#$%^&*()-_=+[]{};:'\"\\|,.<>/?`~".split(""),
] as const;
const actions = Object.keys(actionLabels) as ControlAction[];
type Section = "dial" | "bindings";
type SliceMode = "choice" | "remap" | "confirm-remap" | "move" | null;
type PendingDelete = Readonly<{ label: string; run: () => void }>;

type Props = Readonly<{
  pad: GamepadSnapshot;
  layout: Layout;
  onLayoutChange: (layout: Layout) => void;
  bindings: ButtonBindings;
  onBindingsChange: (bindings: ButtonBindings) => void;
  activeLayerId: string;
  onActiveLayerChange: (id: string) => void;
  leftMapping: AxisMapping;
  rightMapping: AxisMapping;
  onCaptureChange: (capturing: boolean) => void;
  onResetDefaults: () => void;
  onOpenControllerSetup?: () => void;
}>;

export function ConfigPage({
  pad,
  layout,
  onLayoutChange,
  bindings,
  onBindingsChange,
  activeLayerId,
  onActiveLayerChange,
  leftMapping,
  rightMapping,
  onCaptureChange,
  onResetDefaults,
  onOpenControllerSetup,
}: Props) {
  const [section, setSection] = useState<Section>("dial");
  const [layerCursor, setLayerCursor] = useState(0);
  const [side, setSide] = useState<DialSide>("left");
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [bindingCursor, setBindingCursor] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [sliceMode, setSliceMode] = useState<SliceMode>(null);
  const [chooseMove, setChooseMove] = useState(false);
  const [moveTarget, setMoveTarget] = useState<number | null>(null);
  const [keyGroup, setKeyGroup] = useState(0);
  const [keyIndex, setKeyIndex] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (capturing || sliceMode || pendingDelete) overlayRef.current?.focus();
  }, [capturing, sliceMode, pendingDelete]);
  useEffect(() => () => onCaptureChange(false), [onCaptureChange]);
  const [confirmYes, setConfirmYes] = useState(false);
  const layerIds = layout.left.layers.map((layer) => layer.id);
  const currentLayer = layout[side].layers.find(
    (layer) => layer.id === activeLayerId,
  );
  if (!currentLayer) throw new Error(`Missing layer ${activeLayerId}`);
  const duplicatedSliceIds = duplicateSliceIds(layout);
  const leftPosition = readStickPosition(pad.axes, leftMapping);
  const rightPosition = readStickPosition(pad.axes, rightMapping);
  const position = side === "left" ? leftPosition : rightPosition;
  const hovered = highlightedSliceIndex(
    position,
    0.2,
    currentLayer.slices.length,
  );
  const selectedIndex = currentLayer.slices.findIndex(
    (slice) => slice.id === selectedSliceId,
  );
  const selectedSlice = currentLayer.slices[selectedIndex];
  const candidateCharacter = keyGroups[keyGroup][keyIndex];
  const previewTarget = sliceMode === "move" ? (hovered ?? moveTarget) : null;
  const previewSlices =
    selectedIndex >= 0 && previewTarget !== null
      ? moveSlice(currentLayer.slices, selectedIndex, previewTarget)
      : currentLayer.slices;
  const previewLayout =
    selectedIndex >= 0 && previewTarget !== null
      ? updateSlices(layout, side, activeLayerId, () => previewSlices)
      : layout;
  const lastDragTarget = useRef<number | null>(null);
  useEffect(() => {
    if (sliceMode === "move" && hovered !== null)
      lastDragTarget.current = hovered;
  }, [sliceMode, hovered]);
  const requestDelete = (label: string, run: () => void) => {
    setConfirmYes(false);
    setPendingDelete({ label, run });
  };
  const moveLayer = (step: number) => {
    if (layerCursor >= layerIds.length) return;
    const next = layerCursor + step;
    if (next < 0 || next >= layerIds.length) return;
    onLayoutChange(changeLayerOrder(layout, layerCursor, next));
    setLayerCursor(next);
  };
  const addSlice = () => {
    const id = nextConfigId(
      currentLayer.slices.map((slice) => slice.id),
      "custom-slice",
    );
    onLayoutChange(
      updateSlices(layout, side, activeLayerId, (slices) => [
        ...slices,
        { id, character: "" },
      ]),
    );
  };
  const deleteSlice = () => {
    if (currentLayer.slices.length <= 1) return;
    requestDelete(`Delete the last ${side} slice in ${activeLayerId}?`, () => {
      onLayoutChange(
        updateSlices(layout, side, activeLayerId, (slices) =>
          slices.slice(0, -1),
        ),
      );
      setSelectedSliceId(null);
    });
  };
  const clearSliceSelection = () => {
    setSliceMode(null);
    setSelectedSliceId(null);
    setMoveTarget(null);
    lastDragTarget.current = null;
  };
  const confirmRemap = () => {
    if (!selectedSliceId) return;
    const character = keyGroups[keyGroup][keyIndex];
    onLayoutChange(
      updateSlices(layout, side, activeLayerId, (slices) =>
        slices.map((slice) =>
          slice.id === selectedSliceId ? { ...slice, character } : slice,
        ),
      ),
    );
    clearSliceSelection();
  };
  const confirmMove = () => {
    if (selectedIndex < 0 || previewTarget === null) return;
    onLayoutChange(
      updateSlices(layout, side, activeLayerId, (slices) =>
        moveSlice(slices, selectedIndex, previewTarget),
      ),
    );
    clearSliceSelection();
  };
  const addActiveLayer = () => {
    const id = nextConfigId(layerIds, "custom-layer");
    onLayoutChange(addLayer(layout, id));
    onActiveLayerChange(id);
    setLayerCursor(layerIds.length);
  };
  const deleteActiveLayer = () => {
    if (layerIds.length <= 1) return;
    requestDelete(`Delete layer ${activeLayerId} from both dials?`, () => {
      onLayoutChange(removeLayer(layout, activeLayerId));
      onActiveLayerChange(
        layerIds.find((id) => id !== activeLayerId) ?? layerIds[0],
      );
      setLayerCursor(0);
    });
  };
  const handleButton = (index: number) => {
    if (pendingDelete) {
      if (index === 14 || index === 15) setConfirmYes((current) => !current);
      else if (index === 0) {
        if (confirmYes) pendingDelete.run();
        setPendingDelete(null);
      } else if (index === 3 || index === 8) setPendingDelete(null);
      return;
    }
    if (capturing) {
      onBindingsChange({ ...bindings, [actions[bindingCursor]]: index });
      setCapturing(false);
      onCaptureChange(false);
      return;
    }
    if (sliceMode === "choice") {
      if (index === 14 || index === 15) setChooseMove((current) => !current);
      else if (index === 0) {
        if (chooseMove) {
          setMoveTarget(selectedIndex);
          setSliceMode("move");
        } else {
          setKeyGroup(0);
          setKeyIndex(0);
          setSliceMode("remap");
        }
      } else if (index === 3 || index === 8) clearSliceSelection();
      return;
    }
    if (sliceMode === "confirm-remap") {
      if (index === 0) confirmRemap();
      else if (index === 3) setSliceMode("remap");
      else if (index === 8) clearSliceSelection();
      return;
    }
    if (sliceMode === "move") {
      if (index === 0) confirmMove();
      else if (index === 3 || index === 8) clearSliceSelection();
      return;
    }
    if (sliceMode === "remap") {
      if (index === 3) {
        setKeyGroup((current) => (current + 1) % keyGroups.length);
        setKeyIndex(0);
      } else if (index === 8) clearSliceSelection();
      else if (index === 14) setKeyIndex((current) => Math.max(0, current - 1));
      else if (index === 15)
        setKeyIndex((current) =>
          Math.min(keyGroups[keyGroup].length - 1, current + 1),
        );
      else if (index === 12)
        setKeyIndex((current) => Math.max(0, current - 10));
      else if (index === 13)
        setKeyIndex((current) =>
          Math.min(keyGroups[keyGroup].length - 1, current + 10),
        );
      else if (index === 0) setSliceMode("confirm-remap");
      return;
    }
    if (index === 3) {
      setSection((current) => (current === "dial" ? "bindings" : "dial"));
      return;
    }
    if (index === 8) {
      requestDelete(
        "Reset all dial and button mappings to defaults?",
        onResetDefaults,
      );
      return;
    }
    if (section === "dial") {
      if (index === 12) setLayerCursor((current) => Math.max(0, current - 1));
      else if (index === 13)
        setLayerCursor((current) => Math.min(layerIds.length + 1, current + 1));
      else if (index === 4) moveLayer(-1);
      else if (index === 5) moveLayer(1);
      else if (index === 6) setSide("left");
      else if (index === 7) setSide("right");
      else if (bindings.commitLeft !== null && index === 10) addSlice();
      else if (bindings.commitRight !== null && index === 11) deleteSlice();
      else if (index === 0 && layerCursor === layerIds.length) addActiveLayer();
      else if (index === 0 && layerCursor === layerIds.length + 1)
        deleteActiveLayer();
      else if (index === 0 && hovered !== null) {
        setSelectedSliceId(currentLayer.slices[hovered].id);
        setChooseMove(false);
        setSliceMode("choice");
      } else if (index === 0 && layerCursor < layerIds.length)
        onActiveLayerChange(layerIds[layerCursor]);
    } else {
      if (index === 12) setBindingCursor((current) => Math.max(0, current - 1));
      else if (index === 13)
        setBindingCursor((current) =>
          Math.min(actions.length - 1, current + 1),
        );
      else if (index === 0) {
        setCapturing(true);
        onCaptureChange(true);
      } else if (index === 4)
        requestDelete(
          `Clear ${actionLabels[actions[bindingCursor]]} binding?`,
          () =>
            onBindingsChange({ ...bindings, [actions[bindingCursor]]: null }),
        );
    }
  };
  const navigationIndex = (physicalIndex: number) => {
    if (capturing) return physicalIndex;
    const action = (Object.keys(defaultBindings) as ControlAction[]).find(
      (name) => bindings[name] === physicalIndex,
    );
    return action ? (defaultBindings[action] ?? physicalIndex) : physicalIndex;
  };
  useControllerEvents(
    pad,
    defaultBindings,
    leftPosition,
    rightPosition,
    0.2,
    (event) => {
      if (event.kind === "button" && event.phase === "press")
        handleButton(navigationIndex(event.buttonIndex));
      if (
        event.kind === "stick" &&
        event.phase === "center" &&
        sliceMode === "move" &&
        event.side === side &&
        lastDragTarget.current !== null
      ) {
        setMoveTarget(lastDragTarget.current);
      }
    },
  );
  const warnings = [...layoutWarnings(layout)];
  const bindingCounts = new Map<number, number>();
  for (const index of Object.values(bindings))
    if (index !== null)
      bindingCounts.set(index, (bindingCounts.get(index) ?? 0) + 1);
  for (const [index, count] of bindingCounts)
    if (count > 1)
      warnings.push(
        `${index < 16 ? getControllerButtonName(pad.id, index) : inputName(pad, index)} is assigned to ${count} actions.`,
      );
  const currentWarnings = [...new Set(warnings)].sort();
  return (
    <main className="page-shell config-page">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Config</p>
          <h1>Controller setup</h1>
          <p>
            Press the top face button to switch sections or use the tabs below.
            Press the right center button to switch pages. All setup actions
            work with the controller.
          </p>
        </div>
      </header>
      <nav className="config-page__tabs" aria-label="Configuration sections">
        {onOpenControllerSetup && (
          <button type="button" onClick={onOpenControllerSetup}>
            Set up controller
          </button>
        )}
        <button
          type="button"
          aria-pressed={section === "dial"}
          onClick={() => setSection("dial")}
        >
          Dial mappings
        </button>
        <button
          type="button"
          aria-pressed={section === "bindings"}
          onClick={() => setSection("bindings")}
        >
          Generic mappings
        </button>
        <button
          type="button"
          className="config-page__reset"
          onClick={() =>
            requestDelete(
              "Reset all dial and button mappings to defaults?",
              onResetDefaults,
            )
          }
        >
          Reset to defaults
        </button>
      </nav>
      <div className="config-page__sections">
        <section
          className={
            section === "dial"
              ? "config-page__dial-mappings config-page__dial-mappings--active"
              : "config-page__dial-mappings"
          }
          aria-label="Dial mappings"
        >
          <section className="config-panel" aria-label="Dial layers">
            <h2>Layers</h2>
            <p>
              D-pad Up/Down moves through layers, then the Add and Delete
              buttons below. Press the right face button to activate the
              highlighted row. The bumpers reorder layers.
            </p>
            <ul className="config-page__layers">
              {layerIds.map((id, index) => (
                <li
                  key={id}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData("text/plain", String(index))
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = Number(
                      event.dataTransfer.getData("text/plain"),
                    );
                    if (Number.isInteger(from)) {
                      onLayoutChange(changeLayerOrder(layout, from, index));
                      setLayerCursor(index);
                    }
                  }}
                  className={
                    layerCursor === index && section === "dial"
                      ? "config-row config-row--selected"
                      : "config-row"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLayerCursor(index);
                      onActiveLayerChange(id);
                    }}
                  >
                    {id}
                    {id === activeLayerId ? " (active)" : ""}
                  </button>
                </li>
              ))}
            </ul>
            <div
              className="config-page__layer-actions"
              aria-label="Layer actions"
            >
              <button
                type="button"
                className={
                  layerCursor === layerIds.length ? "config-row--selected" : ""
                }
                onClick={() => {
                  setLayerCursor(layerIds.length);
                  addActiveLayer();
                }}
              >
                Add layer
              </button>
              <button
                type="button"
                disabled={layerIds.length <= 1}
                className={
                  layerCursor === layerIds.length + 1
                    ? "config-row--selected"
                    : ""
                }
                onClick={() => {
                  setLayerCursor(layerIds.length + 1);
                  deleteActiveLayer();
                }}
              >
                Delete active layer
              </button>
            </div>
          </section>
          <section className="config-panel" aria-label="Dial slices">
            <h2>Slices</h2>
            <p>
              Triggers choose a dial. Left stick click adds a slice; right stick
              click deletes the last slice after confirmation. Point the stick
              at a slice and press B to choose Remap or Move.
            </p>
            <div
              className="config-page__slice-actions"
              aria-label="Slice actions"
            >
              <button type="button" onClick={addSlice}>
                Add slice (left stick click
                {bindings.commitLeft === null ? (
                  ", unassigned"
                ) : (
                  <>
                    {", "}
                    <GamepadButtonLabel
                      pad={pad}
                      gamepadId={pad.id}
                      buttonIndex={bindings.commitLeft}
                    />
                  </>
                )}
                )
              </button>
              <button type="button" onClick={deleteSlice}>
                Delete last slice (right stick click
                {bindings.commitRight === null ? (
                  ", unassigned"
                ) : (
                  <>
                    {", "}
                    <GamepadButtonLabel
                      pad={pad}
                      gamepadId={pad.id}
                      buttonIndex={bindings.commitRight}
                    />
                  </>
                )}
                )
              </button>
            </div>
            <div className="config-page__dials">
              {(["left", "right"] as const).map((dialSide) => (
                <div
                  key={dialSide}
                  className={
                    side === dialSide
                      ? "config-page__dial config-page__dial--active"
                      : "config-page__dial"
                  }
                >
                  <h3>
                    {dialSide} (
                    {
                      previewLayout[dialSide].layers.find(
                        (layer) => layer.id === activeLayerId,
                      )?.slices.length
                    }{" "}
                    slices)
                  </h3>
                  <Dial
                    config={previewLayout[dialSide]}
                    activeLayerId={activeLayerId}
                    position={
                      dialSide === "left" ? leftPosition : rightPosition
                    }
                    deadzone={0.2}
                    selectedSliceId={dialSide === side ? selectedSliceId : null}
                    flaggedSliceIds={duplicatedSliceIds}
                    onHighlightChange={() => undefined}
                  />
                </div>
              ))}
            </div>
            <p>
              Selected slice:{" "}
              {selectedSliceId
                ? currentLayer.slices.find(
                    (slice) => slice.id === selectedSliceId,
                  )?.character || "unassigned"
                : "none"}
            </p>
          </section>
        </section>
        <section
          className={
            section === "bindings"
              ? "config-panel config-panel--active"
              : "config-panel"
          }
          aria-label="Generic mappings"
        >
          <h2>Generic mappings</h2>
          <p>
            D-pad Up/Down chooses an action. Press the right face button, then
            press the button to assign. Backspace clears after confirmation.
          </p>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Button</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action, index) => (
                <tr
                  key={action}
                  className={
                    section === "bindings" && bindingCursor === index
                      ? "config-row--selected"
                      : ""
                  }
                >
                  <td>{actionLabels[action]}</td>
                  <td>
                    {bindings[action] === null ? (
                      "Unassigned"
                    ) : (
                      <GamepadButtonLabel
                        pad={pad}
                        gamepadId={pad.id}
                        buttonIndex={bindings[action]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section
        className="config-panel"
        aria-label="Current config status"
        aria-live="polite"
      >
        <h2>Current config status</h2>
        {currentWarnings.length ? (
          <ul>
            {currentWarnings.map((warning) => (
              <li
                key={warning}
                className={
                  warning.includes("is assigned")
                    ? "config-warning--duplicate"
                    : ""
                }
              >
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p>No warnings.</p>
        )}
        <p aria-live="polite">
          Warnings always reflect the current layout and never block its use.
        </p>
      </section>
      {capturing && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay"
          role="dialog"
          aria-label="Capture button"
        >
          <h2>Press a button</h2>
          <p>Assign a button to {actionLabels[actions[bindingCursor]]}.</p>
        </div>
      )}
      {sliceMode === "choice" && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay"
          role="dialog"
          aria-label="Slice action"
        >
          <h2>Selected {selectedSlice?.character || "unassigned"}</h2>
          <p>D-pad Left/Right chooses. B continues. X cancels.</p>
          <div className="config-confirm">
            <button
              type="button"
              className={!chooseMove ? "config-confirm__selected" : ""}
              onClick={() => {
                setKeyGroup(0);
                setKeyIndex(0);
                setSliceMode("remap");
              }}
            >
              Remap character
            </button>
            <button
              type="button"
              className={chooseMove ? "config-confirm__selected" : ""}
              onClick={() => {
                setMoveTarget(selectedIndex);
                setSliceMode("move");
              }}
            >
              Move slice
            </button>
          </div>
        </div>
      )}
      {sliceMode === "remap" && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay"
          role="dialog"
          aria-label="QWERTY keyboard"
        >
          <h2>Remap slice</h2>
          <p>
            D-pad moves the lifted slice across the QWERTY keys. X changes key
            group. The right face button previews the new character; press it
            again to confirm. The close button cancels.
          </p>
          <div className="config-keyboard-wrap">
            <div
              className="config-lifted-slice"
              style={{
                left: `${((keyIndex % 10) + 0.5) * 10}%`,
                top: `${Math.floor(keyIndex / 10) * 45}px`,
              }}
            >
              {selectedSlice?.character || "?"}
            </div>
            <div className="config-keyboard">
              {keyGroups[keyGroup].map((key, index) => (
                <button
                  type="button"
                  key={`${index}-${key}`}
                  className={
                    index === keyIndex ? "config-keyboard__selected" : ""
                  }
                  onClick={() => {
                    setKeyIndex(index);
                    setSliceMode("confirm-remap");
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {sliceMode === "confirm-remap" && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay"
          role="dialog"
          aria-label="Confirm remap"
        >
          <h2>Confirm character</h2>
          <div className="config-remap-preview">
            <span>{selectedSlice?.character || "?"}</span>
            <span aria-hidden="true">→</span>
            <span>{candidateCharacter}</span>
          </div>
          <p>
            The dial has not changed yet. Press the right face button to apply,
            the top face button to return to the keyboard, or the close button
            to cancel.
          </p>
          <button type="button" onClick={confirmRemap}>
            Apply {candidateCharacter}
          </button>
        </div>
      )}
      {sliceMode === "move" && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay config-overlay--move"
          role="dialog"
          aria-label="Move slice"
        >
          <h2>Move {selectedSlice?.character || "unassigned"}</h2>
          <p>
            Move the {side} stick to preview a new position. Return to center,
            then press B to confirm. X cancels.
          </p>
          <div className="config-remap-preview">
            <span className="config-remap-preview__lifted">
              {selectedSlice?.character || "?"}
            </span>
            <span>Position {(previewTarget ?? selectedIndex) + 1}</span>
          </div>
          <button type="button" onClick={confirmMove}>
            Confirm position
          </button>
        </div>
      )}
      {pendingDelete && (
        <div
          ref={overlayRef}
          tabIndex={-1}
          className="config-overlay"
          role="alertdialog"
          aria-label="Confirm deletion"
        >
          <h2>Are you sure?</h2>
          <p>{pendingDelete.label}</p>
          <p>D-pad Left/Right chooses. B confirms. X cancels.</p>
          <div className="config-confirm">
            <button
              type="button"
              className={!confirmYes ? "config-confirm__selected" : ""}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={confirmYes ? "config-confirm__selected" : ""}
              onClick={() => {
                pendingDelete.run();
                setPendingDelete(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
