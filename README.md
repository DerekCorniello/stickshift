# StickShift

The typing components are a pair of React dials in `src/typing/`. Each dial renders the slices in its active layer and reports the character under a normalized stick position. `useGamepads` polls connected controllers. `useControllerEvents` reports button press/release events, stick deadzone crossings, and the last highlighted character when a stick returns to center.

```tsx
import { Dial, leftDialConfig, rightDialConfig } from "./src/typing";

<Dial
  config={leftDialConfig}
  activeLayerId="lowercase"
  position={{ x: 0, y: -1 }}
  deadzone={0.2}
  onHighlightChange={(character) => console.log(character)}
/>;
```

Render a second `Dial` with `rightDialConfig` and the same `activeLayerId`. The default layers are `lowercase`, `uppercase`, `numbers-symbols`, and `symbols`. Position `(0, -1)` points up; `(0, 0)` is centered. The callback receives `null` when the stick is inside the deadzone. Override the CSS variables in `dial.css` to restyle the wedges and labels.

On the numbers and symbols layer, the five digits on each dial run from upper left to upper right.

Run `npm install` and `npm run dev` to open the app. Connect a controller to use Practice, Typing Test, Compare, Debug, and Config. Press Start (button 9) to cycle pages without a mouse. A sector changes when the stick moves clearly past its boundary; a small buffer around each boundary prevents minor wobble from switching sectors. Returning to center enters the last selected character. Axis choices can be changed in Debug and last until you switch controllers or reload the page.

## App pages

- **Practice** is a controller-only writing area. Stick selections enter characters on return to center; mapped buttons handle spaces, line breaks, deletion, and caret movement. The on-screen guide uses controller-aware button names and icons when available.
- **Typing Test** uses the two dials to transcribe the shared test passage and reports time, WPM, and character accuracy.
- **Compare** runs that passage twice: first with a one-stick on-screen QWERTY keyboard, then with both dials. Aim with the left stick and press the mapped A / Enter button to select. The keyboard includes letters, digits, punctuation, Shift, Space, and Backspace. Results and the difference between modes are shown together.
- The autocomplete bar stays above the dials. X (top face button) enters or leaves suggestion selection. The sticks continue typing while the D-pad changes the selection; B (bottom face button) accepts it. Holding Backspace, Enter, or Space repeats that editing action after a short delay.
- **Debug** uses the same controller component as Practice, including autocomplete. It also shows the dial event list, axis selectors, typed text, and raw axis and button readings.
- **Config** edits dial layers, slices, characters, and generic button bindings with the controller. X switches between Dial mappings and Generic mappings. D-pad Up/Down moves through the unnumbered layer list and its split Add/Delete controls at the bottom. B activates the highlighted row. Triggers choose a dial, bumpers reorder layers, and the stick-click buttons add or delete slices. Point a stick at a slice and press B to choose Remap or Move. Remap uses the on-screen QWERTY keyboard and requires a second B press to apply the preview. Move previews the new position with the stick and also requires B to confirm. Reset to defaults is available in both sections. Removing a slice, layer, or binding and resetting require confirmation. Current warnings flag duplicates, missing characters, and slice counts outside the recommended range without blocking use. Layout and bindings are saved in the browser. Generic mappings show controller-aware button names and icons when the controller is recognized.

Run `npm run check` to typecheck, lint, check formatting, test the dials, and build the app.

Controller button icons and artwork are by Zacksly under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Interface

The Fieldnotes interface is the main app at `/`. It keeps the writing area,
autocomplete, and both dials together, with controller details in a left rail.
The pre-change interface is recoverable from commit `dc31d12919873f26fddd3bbe697d9eeffaa7cdb4`.

Practice, Speed Test, Head to Head, Customize, and Diagnostics work with a
connected controller. The layout remains visible when no controller is connected.
Aim and return a stick to center to type. Clicking a held stick cancels its
selection: the orange position marker remains, while the slice highlight and
highlighted-character display clear. Move the stick back to center before
selecting again. The default letter layout places Q and U on opposite dials;
existing saved layouts keep their assignments until you use Reset to defaults in Config.
Deadzone and axis mappings are saved per controller in the browser.
Start cycles pages outside timed runs and submits a timed run.

Timed runs end on an exact match, Submit, or after two minutes. They use the passage
"The quick brown fox jumps over the lazy dog." Autocomplete is disabled during timed
runs. The bundled autocomplete word list is generated from the full source CSV by
`scripts/prepare-dictionary.py`; the browser downloads the smaller top-100,000 list.
