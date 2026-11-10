"""Linux gamepad reader and virtual keyboard using evdev."""

from __future__ import annotations

import select
import time

from evdev import InputDevice, UInput, ecodes, list_devices


BUTTON_CODES = {
    ecodes.BTN_SOUTH: 0,
    ecodes.BTN_EAST: 1,
    ecodes.BTN_WEST: 2,
    ecodes.BTN_NORTH: 3,
    ecodes.BTN_TL: 4,
    ecodes.BTN_TR: 5,
    ecodes.BTN_TL2: 6,
    ecodes.BTN_TR2: 7,
    ecodes.BTN_SELECT: 8,
    ecodes.BTN_START: 9,
    ecodes.BTN_THUMBL: 10,
    ecodes.BTN_THUMBR: 11,
    ecodes.BTN_DPAD_UP: 12,
    ecodes.BTN_DPAD_DOWN: 13,
    ecodes.BTN_DPAD_LEFT: 14,
    ecodes.BTN_DPAD_RIGHT: 15,
}
AXIS_CODES = {
    ecodes.ABS_X: 0,
    ecodes.ABS_Y: 1,
    ecodes.ABS_RX: 2,
    ecodes.ABS_RY: 3,
}


def normalize_axis(value: int, minimum: int, maximum: int) -> float:
    center = (minimum + maximum) / 2
    extent = maximum - center if value >= center else center - minimum
    return max(-1.0, min(1.0, (value - center) / extent)) if extent else 0.0


class GamepadReader:
    def __init__(self) -> None:
        self.device: InputDevice | None = None
        self.axes = [0.0, 0.0, 0.0, 0.0]
        self.buttons = [False] * 16
        self.next_scan = 0.0
        self.axis_codes: dict[int, int] = dict(AXIS_CODES)
        self.button_codes: dict[int, int] = dict(BUTTON_CODES)
        self.available_axes = list(range(4))

    def close(self) -> None:
        if self.device is not None:
            self.device.close()
        self.device = None
        self.axes = [0.0, 0.0, 0.0, 0.0]
        self.buttons = [False] * 16

    def _scan(self) -> None:
        if time.monotonic() < self.next_scan:
            return
        self.next_scan = time.monotonic() + 1
        for path in list_devices():
            try:
                device = InputDevice(path)
                caps = device.capabilities(absinfo=False)
                keys = set(caps.get(ecodes.EV_KEY, []))
                axes = set(caps.get(ecodes.EV_ABS, []))
                if len(axes) >= 2 and any(code >= ecodes.BTN_JOYSTICK for code in keys):
                    self.axis_codes = dict(AXIS_CODES)
                    for code in sorted(axes - set(AXIS_CODES)):
                        self.axis_codes[code] = len(self.axis_codes)
                    self.available_axes = sorted(self.axis_codes[code] for code in axes if code in self.axis_codes)
                    self.button_codes = dict(BUTTON_CODES)
                    for code in sorted(keys - set(BUTTON_CODES)):
                        self.button_codes[code] = len(self.button_codes)
                    self.axes = [0.0] * len(self.axis_codes)
                    for code in axes:
                        info = device.absinfo(code)
                        self.axes[self.axis_codes[code]] = normalize_axis(info.value, info.min, info.max)
                    self.buttons = [False] * len(self.button_codes)
                    self.device = device
                    return
                device.close()
            except (OSError, PermissionError):
                continue

    def poll(self) -> None:
        if self.device is None:
            self._scan()
        if self.device is None:
            return
        try:
            if not select.select([self.device.fd], [], [], 0)[0]:
                return
            for event in self.device.read():
                if event.type == ecodes.EV_KEY and event.code in self.button_codes:
                    self.buttons[self.button_codes[event.code]] = event.value != 0
                elif event.type == ecodes.EV_ABS:
                    if event.code in self.axis_codes:
                        info = self.device.absinfo(event.code)
                        self.axes[self.axis_codes[event.code]] = normalize_axis(
                            event.value, info.min, info.max
                        )
                    if event.code == ecodes.ABS_HAT0X:
                        self.buttons[14] = event.value < 0
                        self.buttons[15] = event.value > 0
                    elif event.code == ecodes.ABS_HAT0Y:
                        self.buttons[12] = event.value < 0
                        self.buttons[13] = event.value > 0
        except OSError:
            self.close()

    def snapshot(self) -> dict | None:
        if self.device is None:
            return None
        return {
            "id": self.device.name,
            "index": 0,
            "connected": True,
            "mapping": "standard",
            "axes": self.axes.copy(),
            "availableAxes": self.available_axes.copy(),
            "buttons": [
                {"pressed": pressed, "value": int(pressed)}
                for pressed in self.buttons
            ],
        }


UNSHIFTED = "-=[]\\;',./`"
SHIFTED = '_+{}|:"<>?~'
PUNCTUATION_KEYS = (
    "MINUS", "EQUAL", "LEFTBRACE", "RIGHTBRACE", "BACKSLASH",
    "SEMICOLON", "APOSTROPHE", "COMMA", "DOT", "SLASH", "GRAVE",
)
SHIFTED_DIGITS = "!@#$%^&*()"
SPECIAL_KEYS = {
    " ": ecodes.KEY_SPACE,
    "ENTER": ecodes.KEY_ENTER,
    "BACKSPACE": ecodes.KEY_BACKSPACE,
    "LEFT": ecodes.KEY_LEFT,
    "RIGHT": ecodes.KEY_RIGHT,
    "UP": ecodes.KEY_UP,
    "DOWN": ecodes.KEY_DOWN,
}


def key_for_character(character: str) -> tuple[int, bool]:
    if character in SPECIAL_KEYS:
        return SPECIAL_KEYS[character], False
    if len(character) != 1:
        raise ValueError(f"Unsupported key {character!r}")
    if character.isascii() and character.isalpha():
        return getattr(ecodes, f"KEY_{character.upper()}"), character.isupper()
    if character in "0123456789":
        return getattr(ecodes, f"KEY_{character}"), False
    if character in SHIFTED_DIGITS:
        return getattr(ecodes, f"KEY_{(SHIFTED_DIGITS.index(character) + 1) % 10}"), True
    for chars, shifted in ((UNSHIFTED, False), (SHIFTED, True)):
        if character in chars:
            return getattr(ecodes, f"KEY_{PUNCTUATION_KEYS[chars.index(character)]}"), shifted
    raise ValueError(f"Unsupported key {character!r}")


class VirtualKeyboard:
    def __init__(self) -> None:
        keys = {ecodes.KEY_LEFTSHIFT, *SPECIAL_KEYS.values()}
        keys.update(getattr(ecodes, f"KEY_{letter}") for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        keys.update(getattr(ecodes, f"KEY_{digit}") for digit in "0123456789")
        keys.update(getattr(ecodes, f"KEY_{name}") for name in PUNCTUATION_KEYS)
        self.device = UInput({ecodes.EV_KEY: sorted(keys)}, name="StickShift virtual keyboard")

    def press(self, character: str) -> None:
        code, shifted = key_for_character(character)
        if shifted:
            self.device.write(ecodes.EV_KEY, ecodes.KEY_LEFTSHIFT, 1)
        self.device.write(ecodes.EV_KEY, code, 1)
        self.device.syn()
        self.device.write(ecodes.EV_KEY, code, 0)
        if shifted:
            self.device.write(ecodes.EV_KEY, ecodes.KEY_LEFTSHIFT, 0)
        self.device.syn()

    def close(self) -> None:
        self.device.close()
