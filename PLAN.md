# StickShift

StickShift is a controller typing system built around two dials, one per joystick. The hackathon deliverable is a browser demo with a reusable React input module that another React app could import later.

## Stack

React and TypeScript, using the browser Gamepad API for joystick positions and button input. For the demo, assume the browser exposes the connected controller. Setup for controllers with raw, unmapped controls and publishing the module as a package can wait.

## Demo flow

1. **Practice:** Show a controller-only writing area, both dials, and a concise on-screen control guide. Keep autocomplete visible above the dials. X (top) enters suggestion selection, the D-pad moves the selection, and B (bottom) accepts a suggestion and returns to typing.
2. **Typing test:** Show the sentence "The quick brown fox jumps over the lazy dog." to transcribe with the two dials. Show time, words per minute (WPM), and keystroke accuracy during and after the run.
3. **Comparison:** Type that same sentence first with a one-stick on-screen QWERTY keyboard, then with the two dials. Show each mode's time, WPM, and keystroke accuracy side by side, with the differences. The QWERTY grid has letters, digits, punctuation, Shift, Space, and Backspace. Move its focus with the left stick and select a key with A.

The timer starts with the first entered character. A run ends when the text exactly matches the prompt, when the user presses Submit, or after two minutes. An early submission or timeout is scored using the text entered so far. WPM is correctly entered final characters divided by five, then divided by elapsed minutes. Keystroke accuracy is correct character insertions divided by all character insertions; mistakes still count after correction, and Backspace is not an insertion. Autocomplete is off during timed runs. Results are not saved after refresh.

The app currently has two destinations: Practice for controller-only writing and Debug for raw controller diagnostics. A separate configuration page is not part of the current interface.

## Controls

Both sticks control their respective dials. Automatic selection is the default: moving beyond the adjustable deadzone highlights the pointed sector immediately. A small angular buffer around sector boundaries prevents minor stick wobble from changing the highlight or pending character; moving clearly into another sector updates both immediately. Returning to the deadzone clears the highlight and enters the last confirmed character once. In manual mode, moving the stick highlights a sector and clicking that stick enters its character.

The input module supports customizable action bindings. The current app uses these defaults and does not include a settings page:

| Control              | Action                                                        |
| -------------------- | ------------------------------------------------------------- |
| Left / right trigger | Previous / next generated layer                               |
| Left / right bumper  | Backspace / Space                                             |
| Plus                 | Submit text or end a timed run early                          |
| Minus                | Leave autocomplete selection                                  |
| X (top)              | Enter or leave autocomplete selection                          |
| B (bottom)           | Enter while typing; accept a suggestion in autocomplete       |
| D-pad                | Move the text cursor or autocomplete selection                |
| B                    | Unassigned                                                    |

The D-pad moves the writing caret while typing and changes the active suggestion while autocomplete has focus. Holding Backspace, Enter, or Space repeats that action after a short delay. Stick character entry does not repeat.

## Dial layout and settings

The default has four explicit layers for all 94 printable ASCII characters other than Space: 26 lowercase letters, 26 uppercase letters, 10 digits, and 32 symbols (including backtick and backslash). The first three layers have 13 sectors per dial. The final layer has eight wider sectors. Slice zero is at the top, and the rest advance clockwise.

The letter layout is a heuristic based on [English letter and bigram counts](https://www.norvig.com/mayzner.html). Common letters are spread across the two sticks, with E and T at the top. Frequent pairs such as TH, ER, and AN sit at nearby angles. The uppercase layer uses the same positions. It is an authored default, not a measured speed optimum.

| Layer               | Left dial                                       | Right dial                                      |
| ------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Lowercase           | `e h a i d u q f g y v x s`, clockwise from top | `t n o l c m p w b k j z r`, clockwise from top |
| Uppercase           | Same positions in uppercase                     | Same positions in uppercase                     |
| Numbers and symbols | `0-4` across the top, eight symbols elsewhere   | `5-9` across the top, eight symbols elsewhere   |
| Symbols             | Eight symbols                                   | Eight symbols                                   |

The 32 punctuation characters follow ASCII code-point order across the two symbol layers.

The current app uses the authored default layout. A future configuration experience may let users change sector count, character placement, selection mode, deadzone, and action bindings.

## Project structure

- `src/app/`: App shell, page navigation, and shared styling.
- `src/pages/`: Free typing, typing test, and comparison screens.
- `src/typing/`: Reusable dial input, gamepad controls, autocomplete, and settings.
- `src/benchmark/`: Timed runs, scoring, and comparison results.
- `src/data/`: The test sentence and local autocomplete dictionary.

Keep components and tests beside the feature that uses them. Add more directories only when the code needs them.

## Demo checks

- Try Practice and Debug with the team's three controllers and verify axis remapping.
- Check exact completion, early submission, and timeout. Verify WPM and keystroke accuracy after errors and corrections.
- Check that autocomplete works in free typing and stays off in both timed modes.
- Check that minor movement around a sector boundary does not change the visual highlight or pending character, while moving clearly into another sector updates both immediately. Returning to the deadzone clears the highlight and enters only the last confirmed character. Check both sticks and a layer change while held.
