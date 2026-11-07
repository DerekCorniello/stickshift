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

Run `npm install` and `npm run dev` to open the app. Connect a controller and move its sticks to highlight characters. The highlight and pending character change immediately when the stick moves clearly past a sector boundary; a small buffer around each boundary prevents minor wobble from switching sectors. The event list reports the confirmed character when each stick returns to the deadzone. The left and right triggers move between layers, and the layer buttons do the same. Other buttons appear in the event list with their default action names, ready for later typing behavior. If a stick uses unusual axes, use its X and Y selectors below the dial. For example, choose axes 6 and 7 for a stick that reports there. The visualizer below the dials shows the live axis numbers and values. Axis choices last until you switch controllers or reload the page. Character entry and autocomplete are not connected yet.

Run `npm run check` to typecheck, lint, check formatting, test the dials, and build the app.
