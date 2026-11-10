import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from desktop.app import DesktopService, device_classes, profile_path
from desktop.test_input_engine import FakeKeyboard


class FakeReader:
    def poll(self):
        pass

    def snapshot(self):
        return None

    def close(self):
        pass


class ProfileTests(unittest.TestCase):
    def test_profile_path_uses_platform_user_data(self):
        self.assertEqual(profile_path("darwin"), Path.home() / "Library" / "Application Support" / "StickShift" / "controllers.json")

    def test_desktop_profile_survives_service_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "controllers.json"
            with patch("desktop.app.profile_path", return_value=path):
                service = DesktopService(FakeKeyboard, FakeReader)
                service.save_profile("Odd pad", {"accepted": True, "bindings": {"space": 22}})
                service.close()
                restored = DesktopService(FakeKeyboard, FakeReader)
                self.assertEqual(restored.status()["profiles"]["Odd pad"]["bindings"]["space"], 22)
                restored.close()

    def test_macos_backend_is_selected(self):
        reader, keyboard = device_classes("darwin")
        self.assertEqual(reader.__module__, "desktop.mac_devices")
        self.assertEqual(keyboard.__module__, "desktop.mac_devices")

    def test_macos_keyboard_posts_key_pairs(self):
        from desktop.mac_devices import VirtualKeyboard
        events = []

        class Quartz:
            kCGHIDEventTap = 0

            @staticmethod
            def AXIsProcessTrusted():
                return True

            @staticmethod
            def CGEventCreateKeyboardEvent(source, code, down):
                return {"code": code, "down": down}

            @staticmethod
            def CGEventKeyboardSetUnicodeString(event, length, value):
                event["text"] = value

            @staticmethod
            def CGEventPost(tap, event):
                events.append(event)

        with patch.dict("sys.modules", {"Quartz": Quartz}):
            keyboard = VirtualKeyboard()
            keyboard.press("é")
            keyboard.press("LEFT")
        self.assertEqual([(event["down"], event["code"]) for event in events], [(True, 0), (False, 0), (True, 0x7B), (False, 0x7B)])
        self.assertEqual(events[0]["text"], "é")


if __name__ == "__main__":
    unittest.main()
