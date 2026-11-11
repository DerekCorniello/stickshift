# StickShift desktop guide

The desktop app shows the two typing dials in a small window and sends controller typing to the application with keyboard focus. It runs on Linux, Windows, and macOS. The [web app](../README.md) has Practice, Speed test, Head to head, and Diagnostics.

The Theme menu in the window footer offers StickShift, Xbox, PlayStation, and Switch colors in light and dark mode. It saves your choice for the next launch.

## Install and start

Build the interface and install the Python dependencies for your operating system. Run these commands from the project directory.

### Linux

```sh
npm install
npm run build:desktop
python3 -m venv --system-site-packages .venv
.venv/bin/pip install -r desktop/requirements.txt
.venv/bin/python -m desktop.app
```

The window needs your distribution's GTK 3 and WebKit2GTK 4.1 Python bindings. The virtual environment includes system site packages so it can use them. Your account also needs read access to the controller under `/dev/input/event*` and write access to `/dev/uinput`. If `/dev/uinput` is missing, load the `uinput` kernel module. Set device permissions through your distribution's input group or a udev rule. The window reports an error if it cannot open the virtual keyboard.

### Windows

Use Python 3.11 or newer and Node.js. In PowerShell:

```powershell
npm install
npm run build:desktop
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r desktop\requirements-windows.txt
.venv\Scripts\python.exe -m desktop.app
```

Install the WebView2 Runtime if the window does not open. The app reads XInput controllers first and can use SDL for other controllers. If the program you want to type into runs as administrator, Windows may block keys sent by a non-administrator copy of StickShift.

### macOS

Use Python 3.11 or newer and Node.js:

```sh
npm install
npm run build:desktop
python3 -m venv .venv
.venv/bin/python -m pip install -r desktop/requirements-macos.txt
.venv/bin/python -m desktop.app
```

Grant the Python app Accessibility permission in System Settings so it can send keys to other applications. The macOS backend has automated tests, but it has not been tested with a physical controller on a Mac.

## Connect and set up

Connect a controller, then open StickShift. Its name appears at the top of the window. A new controller opens a live diagram. Choose **Set up**, let the controller rest for two seconds, and follow the prompts for each button and stick direction. Make a slow circle with each stick when asked. At the end, test the live diagram and choose **Good, save controller** or **Redo setup**. You can recapture individual controls in the review step or reopen setup from Config later.

## Type in another application

Open **Dials**, then focus a text field in another application. Point either stick at a character and return it to center to type. Use the mapped Space, Backspace, and Enter buttons to edit. The D-pad moves the cursor. The window shows the active layer, suggestions, and a live controller diagram.

To use a suggestion, press the mapped Autocomplete button, choose a word with the D-pad, then press the mapped Enter button. By default, Enter also accepts the first suggestion when the list is closed. Press Autocomplete again to leave selection mode. Holding a D-pad direction repeats its action.

Open **Config** at the top of the window, or use the mapped Submit button to switch between Dials and Config. Config edits dial characters and button bindings. System typing pauses while Config is open and resumes when you return to Dials. Close StickShift to stop keyboard output.

The deadzone slider controls how far the stick must move to select a character. After one character is entered, the stick must move farther before it can start another selection. This filters small rebounds around the center.

## Saved profiles and checks

Controller profiles are saved in `StickShift/controllers.json` under your platform's user-data directory:

| System  | Location                                                                                   |
| ------- | ------------------------------------------------------------------------------------------ |
| Linux   | `~/.config/StickShift/controllers.json`, or `$XDG_CONFIG_HOME/StickShift/controllers.json` |
| Windows | `%APPDATA%\StickShift\controllers.json`                                                    |
| macOS   | `~/Library/Application Support/StickShift/controllers.json`                                |

The desktop service listens on `127.0.0.1:8765` while its window is open. Linux sends printable ASCII using a US keyboard layout. Windows and macOS use Unicode keyboard events. Controller vibration is available only in the web app.

Run the desktop tests with:

```sh
.venv/bin/python -m unittest discover -s desktop -p 'test_*.py'
```
