# StickShift

The typing components are a pair of React dials in `src/typing/`. Each dial renders the slices in its active layer and reports the character under a normalized stick position. `src/app/useGamepad.ts` polls connected controllers and returns snapshots of their axes and buttons. The hook is not wired to the dials or character entry yet.

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

Run `npm install` and `npm run dev` to open the gamepad visualizer. Run `npm run check` to typecheck, lint, check formatting, test the dials, and build the app.
