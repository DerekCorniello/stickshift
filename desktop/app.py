"""Run the StickShift controller keyboard as a desktop application."""

from __future__ import annotations

import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable

from .input_engine import InputEngine, Keyboard
ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist-desktop"


def device_classes(platform: str | None = None):
    platform = sys.platform if platform is None else platform
    if platform == "linux":
        from .linux_devices import GamepadReader, VirtualKeyboard
    elif platform == "win32":
        from .windows_devices import GamepadReader, VirtualKeyboard
    else:
        raise RuntimeError(f"Unsupported desktop platform: {platform}")
    return GamepadReader, VirtualKeyboard


class DesktopService:
    def __init__(
        self,
        keyboard_factory: Callable[[], Keyboard] | None = None,
        reader_factory: Callable[[], object] | None = None,
    ) -> None:
        default_reader, default_keyboard = device_classes()
        self.lock = threading.RLock()
        self.reader = (reader_factory or default_reader)()
        self.engine = InputEngine()
        self.stop_event = threading.Event()
        self.keyboard_error = ""
        try:
            self.engine.set_keyboard((keyboard_factory or default_keyboard)())
        except OSError as error:
            self.keyboard_error = f"Virtual keyboard unavailable: {error}"

    def run(self) -> None:
        while not self.stop_event.wait(1 / 60):
            with self.lock:
                self.reader.poll()
                try:
                    self.engine.process(self.reader.snapshot())
                except OSError as error:
                    self.keyboard_error = f"Keyboard output failed: {error}"
                    self.engine.set_keyboard(None)

    def close(self) -> None:
        self.stop_event.set()
        with self.lock:
            self.engine.set_keyboard(None)
            self.reader.close()

    def status(self) -> dict:
        with self.lock:
            pad = self.reader.snapshot()
            return {
                "gamepads": {"0": pad} if pad is not None else {},
                "keyboardError": self.keyboard_error,
            }

    def configure(self, config: dict) -> None:
        with self.lock:
            self.engine.configure(config)

def handler_for(service: DesktopService) -> type[SimpleHTTPRequestHandler]:
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DIST), **kwargs)

        def _json(self, status: int, payload: dict) -> None:
            data = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:
            if self.path == "/api/desktop":
                self._json(200, service.status())
            else:
                super().do_GET()

        def do_POST(self) -> None:
            if self.path != "/api/desktop/config":
                self._json(404, {"error": "Unknown endpoint"})
                return
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                self._json(415, {"error": "Expected JSON"})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 100_000:
                    raise ValueError("Invalid request size")
                payload = json.loads(self.rfile.read(size))
                if not isinstance(payload, dict):
                    raise ValueError("Expected an object")
                service.configure(payload)
                self._json(200, {"ok": True})
            except (ValueError, OSError) as error:
                self._json(400, {"error": str(error)})

        def log_message(self, format: str, *args) -> None:
            pass

    return Handler


def main() -> int:
    if sys.platform not in ("linux", "win32"):
        print("The desktop keyboard backend supports Linux and Windows.", file=sys.stderr)
        return 1
    if not (DIST / "desktop.html").exists():
        print("Build the desktop interface first: npm run build:desktop", file=sys.stderr)
        return 1
    try:
        import webview
    except ImportError:
        print("Install desktop dependencies: pip install -r desktop/requirements.txt", file=sys.stderr)
        return 1

    service = DesktopService()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), handler_for(service))
    thread = threading.Thread(target=service.run, daemon=True)
    thread.start()
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    try:
        webview.create_window(
            "StickShift",
            "http://127.0.0.1:8765/desktop.html",
            width=900,
            height=600,
            min_size=(650, 450),
        )
        webview.start()
    finally:
        service.close()
        server.shutdown()
        thread.join(timeout=2)
        server_thread.join(timeout=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
