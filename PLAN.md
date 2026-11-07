# StickShift

StickShift is a controller typing system built around two dials, one per joystick. The hackathon deliverable is a browser demo with a reusable React input module that another React app could import later.

## Stack

React and TypeScript, using the browser Gamepad API for joystick positions and button input. For the demo, assume the browser exposes the connected controller. Setup for controllers with raw, unmapped controls and publishing the module as a package can wait.

## Demo flow

1. **Free typing:** Show an editable text box and both dials. Local dictionary autocomplete is available here.
2. **Typing test:** Show the sentence "The quick brown fox jumps over the lazy dog." to transcribe with the two dials. Show time, words per minute (WPM), and keystroke accuracy during and after the run.
3. **Comparison:** Type that same sentence first with a one-stick on-screen QWERTY keyboard, then with the two dials. Show each mode's time, WPM, and keystroke accuracy side by side, with the differences. The QWERTY grid has letters, digits, punctuation, Shift, Space, and Backspace. Move its focus with the left stick and select a key with A.

The timer starts with the first entered character. A run ends when the text exactly matches the prompt, when the user presses Submit, or after two minutes. An early submission or timeout is scored using the text entered so far. WPM is correctly entered final characters divided by five, then divided by elapsed minutes. Keystroke accuracy is correct character insertions divided by all character insertions; mistakes still count after correction, and Backspace is not an insertion. Autocomplete is off during timed runs. Results are not saved after refresh.

## Controls

Both sticks control their respective dials. Automatic selection is the default: moving beyond the adjustable deadzone highlights the pointed sector immediately. A small angular buffer around sector boundaries prevents minor stick wobble from changing the highlight or pending character; moving clearly into another sector updates both immediately. Returning to the deadzone clears the highlight and enters the last confirmed character once. In manual mode, moving the stick highlights a sector and clicking that stick enters its character.

All action bindings are customizable. Defaults are:

| Control              | Action                                                        |
| -------------------- | ------------------------------------------------------------- |
| Left / right trigger | Previous / next generated layer                               |
| Left / right bumper  | Backspace / Space                                             |
| A                    | Enter while typing; select a key on the one-stick QWERTY grid |
| Plus                 | Submit text or end a timed run early                          |
| Minus                | Close the typing interface                                    |
| X                    | Open or close autocomplete                                    |
| D-pad                | Move the text cursor while autocomplete is closed             |
| B                    | Unassigned                                                    |

While autocomplete is open, D-pad Left and Right move through suggestions, Up accepts the selected suggestion, and Down closes the menu. Accepting a suggestion replaces the current word. The settings panel can remap these actions too.

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

Users can set any positive whole number of sectors per dial, with no upper limit or warning. Changing the count regenerates a complete layout, after which users can move characters between sectors and layers. Save the sector count, character placement, selection mode, deadzone, and action bindings in the current browser.

## Project structure

- `src/app/`: App shell, page navigation, and shared styling.
- `src/pages/`: Free typing, typing test, and comparison screens.
- `src/typing/`: Reusable dial input, gamepad controls, autocomplete, and settings.
- `src/benchmark/`: Timed runs, scoring, and comparison results.
- `src/data/`: The test sentence and local autocomplete dictionary.

Keep components and tests beside the feature that uses them. Add more directories only when the code needs them.

## Demo checks

- Try the three-page flow with the team's three controllers, including both selection modes, changed sector counts, remapped buttons, and settings after refresh.
- Check exact completion, early submission, and timeout. Verify WPM and keystroke accuracy after errors and corrections.
- Check that autocomplete works in free typing and stays off in both timed modes.
- Check that minor movement around a sector boundary does not change the visual highlight or pending character, while moving clearly into another sector updates both immediately. Returning to the deadzone clears the highlight and enters only the last confirmed character. Check both sticks and a layer change while held.
