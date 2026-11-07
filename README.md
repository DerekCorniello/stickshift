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
- The autocomplete bar stays above the dials. X (top face button) enters or leaves suggestion selection, the D-pad changes the selection, and B (bottom face button) accepts it and returns focus to the dials. Holding Backspace, Enter, or Space repeats that editing action after a short delay.
- **Debug** uses the same controller component as Practice, including autocomplete. It also shows the dial event list, axis selectors, typed text, and raw axis and button readings.
- **Config** edits dial layers, slices, characters, and generic button bindings with the controller. X switches between Dial mappings and Generic mappings. D-pad Up/Down moves through the unnumbered layer list and its split Add/Delete controls at the bottom. B activates the highlighted row. Triggers choose a dial, bumpers reorder layers, and the stick-click buttons add or delete slices. Point a stick at a slice and press B to choose Remap or Move. Remap uses the on-screen QWERTY keyboard and requires a second B press to apply the preview. Move previews the new position with the stick and also requires B to confirm. Reset to defaults is available in both sections. Removing a slice, layer, or binding and resetting require confirmation. Current warnings flag duplicates, missing characters, and slice counts outside the recommended range without blocking use. Layout and bindings are saved in the browser. Generic mappings show controller-aware button names and icons when the controller is recognized.

Run `npm run check` to typecheck, lint, check formatting, test the dials, and build the app.

Controller button icons and artwork are by Zacksly under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Interface concepts

The original interface is available at `/` and `/original`. Five alternate layouts
use the same controller logic and settings:

| Route   | Direction                        | Layout                                                                                                      |
| ------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/ui-1` | Cockpit, navy and mint           | Writing area above compact dials; suggestions above the dials; controls and session details in a right rail |
| `/ui-2` | Fieldnotes, cream and terracotta | Editorial workspace with a left rail                                                                        |
| `/ui-3` | Arcade, purple and lime          | Game board with a bottom control strip                                                                      |
| `/ui-4` | Lab, white and cobalt            | Vertical page navigation and a right instrument panel                                                       |
| `/ui-5` | Arena, charcoal and amber        | Presentation stage with a right score panel                                                                 |

Each route has Practice, Speed Test, Head to Head, Customize, and Diagnostics.
The layouts remain visible without a controller; controller input requires a connected
pad. The alternate layouts offer release-to-type and stick-click modes, an adjustable
deadzone, and axis mappings saved per controller in the browser. Start cycles pages
outside timed runs; during a timed run it submits the result. The original source
is also recoverable from commit `dc31d12919873f26fddd3bbe697d9eeffaa7cdb4`.

Timed runs end on an exact match, Submit, or after two minutes. They use the passage
"The quick brown fox jumps over the lazy dog." Autocomplete is disabled during timed
runs. The bundled autocomplete word list is generated from the full source CSV by
`scripts/prepare-dictionary.py`; the browser downloads the smaller top-100,000 list.
