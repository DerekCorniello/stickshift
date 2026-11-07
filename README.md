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

Run `npm install` and `npm run dev` to open the app. Connect a controller to use Practice and Debug. A sector changes when the stick moves clearly past its boundary; a small buffer around each boundary prevents minor wobble from switching sectors. Returning to center enters the last selected character. Axis choices can be changed in Debug and last until you switch controllers or reload the page.

## App pages

- **Practice** is a controller-only writing area. Stick selections enter characters on return to center; mapped buttons handle spaces, line breaks, deletion, and caret movement. The on-screen guide lists the current button actions.
- The autocomplete bar stays above the dials. X (top face button) enters or leaves suggestion selection, the D-pad changes the selection, and B (bottom face button) accepts it and returns focus to the dials. Holding Backspace, Enter, or Space repeats that editing action after a short delay.
- **Debug** uses the same controller component as Practice, including autocomplete. It also shows the dial event list, axis selectors, typed text, and raw gamepad visualizer.

Run `npm run check` to typecheck, lint, check formatting, test the dials, and build the app.
