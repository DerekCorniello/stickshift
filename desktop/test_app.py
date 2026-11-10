import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen

from desktop.app import DesktopService, handler_for
from desktop.test_input_engine import FakeKeyboard, config


class DesktopServerTests(unittest.TestCase):
    def test_config_and_status_over_local_http(self):
        service = DesktopService(FakeKeyboard)
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(service))
        thread = threading.Thread(target=server.serve_forever)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            request = Request(
                base + "/api/desktop/config",
                data=json.dumps(config()).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urlopen(request) as response:
                self.assertEqual(response.status, 200)
            with urlopen(base + "/api/desktop") as response:
                state = json.load(response)
            self.assertEqual(
                state,
                {
                    "gamepads": {},
                    "keyboardError": "",
                    "autocomplete": {
                        "active": False,
                        "word": "",
                        "suggestions": [],
                        "selectedIndex": 0,
                    },
                    "profiles": {},
                },
            )
        finally:
            server.shutdown()
            server.server_close()
            service.close()
            thread.join()
