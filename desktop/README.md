# Linux desktop app

This version opens the StickShift dials in a compact desktop window. Python reads a Linux gamepad through `evdev` and creates a virtual keyboard through `uinput`, so typed characters go to the application with keyboard focus. The website still uses the browser Gamepad API.

## Setup

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

## Using it

Connect a controller and open the app. This window shows the two dials and layer controls. System typing starts automatically. Focus a text field in another application; stick selections, Space, Backspace, Enter, and D-pad cursor movement go there. Close StickShift to stop keyboard output. Practice, tests, and diagnostics remain on the website.

The virtual keyboard maps printable ASCII to a US keyboard layout. This version reads common Linux gamepad axes and buttons; raw controllers with different kernel mappings may need an adapter in `desktop/linux_devices.py`. Controller vibration is browser-only. The keyboard backend cannot be exercised in an environment without `/dev/input` and `/dev/uinput`.

Run the desktop tests with:

```sh
.venv/bin/python -m unittest discover -s desktop -p 'test_*.py'
```
