# Desktop app

This version opens the StickShift dials in a compact desktop window. On Linux, Python reads a controller through `evdev` and creates a virtual keyboard through `uinput`. On Windows, it reads an XInput controller and sends keys through the Windows `SendInput` API. Both send characters to the application with keyboard focus. The website still uses the browser Gamepad API.

## Linux setup

From the repository root:

```sh
npm install
npm run build:desktop
python3 -m venv --system-site-packages .venv
.venv/bin/pip install -r desktop/requirements.txt
.venv/bin/python -m desktop.app
```

The webview needs your distribution's GTK 3 and WebKit2GTK 4.1 Python bindings. The virtual environment uses system site packages so it can see those bindings. The program listens only on `127.0.0.1:8765` while its window is open.

Your user needs read access to the controller under `/dev/input/event*` and write access to `/dev/uinput`. If `/dev/uinput` is missing, load the `uinput` kernel module. Configure device permissions through your distribution's input group or a udev rule before starting the app. The window reports an error if the virtual keyboard cannot open.

## Windows setup

Use Python 3.11 or newer and Node.js. From PowerShell in the repository root:

```powershell
npm install
npm run build:desktop
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r desktop\requirements-windows.txt
.venv\Scripts\python.exe -m desktop.app
```

The window uses pywebview's Windows backend. Install the WebView2 Runtime if the window cannot open. XInput controllers are preferred, and pygame provides a generic SDL fallback for DirectInput and other HID controllers when no XInput controller is connected. The program reads controller state without changing its connection. Windows may block keyboard output to an app running as administrator when StickShift is not running at the same privilege level.

## Using it

Connect a controller and open the app. This window shows the two dials, layer controls, and word suggestions. System typing starts automatically. Focus a text field in another application; stick selections, Space, Backspace, Enter, and D-pad cursor movement go there. Suggestions for text typed with the sticks stay visible. Press the autocomplete button to enter selection mode, use the D-pad to choose a word, then press the Enter button to replace the current word and add a space. Press the autocomplete button again to leave selection mode. Close StickShift to stop keyboard output. Practice, tests, and diagnostics remain on the website.

On Linux, the virtual keyboard maps printable ASCII to a US keyboard layout. This version reads common Linux gamepad axes and buttons; raw controllers with different kernel mappings may need an adapter in `desktop/linux_devices.py`. On Windows, printable characters use Unicode keyboard events, while Backspace, Enter, and arrow keys use virtual keys. Controller vibration is browser-only. The Linux keyboard backend cannot be exercised in an environment without `/dev/input` and `/dev/uinput`.

Run the desktop tests with:

```sh
.venv/bin/python -m unittest discover -s desktop -p 'test_*.py'
```
