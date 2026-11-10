"""macOS controller input and keyboard events."""

from __future__ import annotations

from .windows_devices import GenericGamepadReader


class GamepadReader(GenericGamepadReader):
    """SDL exposes macOS gamepads through pygame's generic reader."""


SPECIAL_KEYS = {
    "BACKSPACE": 0x33,
    "ENTER": 0x24,
    " ": 0x31,
    "LEFT": 0x7B,
    "RIGHT": 0x7C,
    "DOWN": 0x7D,
    "UP": 0x7E,
}


class VirtualKeyboard:
    def __init__(self) -> None:
        try:
            import Quartz
        except ImportError as error:
            raise OSError("macOS keyboard output requires PyObjC Quartz") from error
        self.quartz = Quartz
        if not Quartz.AXIsProcessTrusted():
            raise OSError("Grant StickShift Accessibility permission in macOS System Settings")

    def press(self, character: str) -> None:
        key = SPECIAL_KEYS.get(character, 0)
        for down in (True, False):
            event = self.quartz.CGEventCreateKeyboardEvent(None, key, down)
            if event is None:
                raise OSError("Could not create macOS keyboard event")
            if character not in SPECIAL_KEYS:
                units = len(character.encode("utf-16-le")) // 2
                self.quartz.CGEventKeyboardSetUnicodeString(event, units, character)
            self.quartz.CGEventPost(self.quartz.kCGHIDEventTap, event)

    def close(self) -> None:
        pass
