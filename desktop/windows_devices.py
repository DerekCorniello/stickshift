"""Read XInput controllers and send keyboard input on Windows."""

from __future__ import annotations

import ctypes
import time
from typing import Callable

WORD = ctypes.c_uint16
DWORD = ctypes.c_uint32
LONG = ctypes.c_int32
UINT = ctypes.c_uint32


class XInputGamepad(ctypes.Structure):
    _fields_ = [
        ("buttons", WORD),
        ("left_trigger", ctypes.c_ubyte),
        ("right_trigger", ctypes.c_ubyte),
        ("left_x", ctypes.c_short),
        ("left_y", ctypes.c_short),
        ("right_x", ctypes.c_short),
        ("right_y", ctypes.c_short),
    ]


class XInputState(ctypes.Structure):
    _fields_ = [("packet_number", DWORD), ("gamepad", XInputGamepad)]


BUTTON_MASKS = (
    0x1000,  # A
    0x2000,  # B
    0x4000,  # X
    0x8000,  # Y
    0x0100,  # left bumper
    0x0200,  # right bumper
    None,    # left trigger is analog
    None,    # right trigger is analog
    0x0020,  # back
    0x0010,  # start
    0x0040,  # left stick click
    0x0080,  # right stick click
    0x0001,  # D-pad up
    0x0002,  # D-pad down
    0x0004,  # D-pad left
    0x0008,  # D-pad right
)


def _axis(value: int, invert: bool = False) -> float:
    normalized = value / (32768 if value < 0 else 32767)
    return -normalized if invert else normalized


def gamepad_snapshot(state: XInputState, index: int) -> dict:
    gamepad = state.gamepad
    pressed = [
        bool(gamepad.buttons & mask) if mask is not None else False
        for mask in BUTTON_MASKS
    ]
    pressed[6] = gamepad.left_trigger >= 128
    pressed[7] = gamepad.right_trigger >= 128
    return {
        "id": f"XInput Controller {index + 1}",
        "index": 0,
        "connected": True,
        "mapping": "standard",
        "axes": [
            _axis(gamepad.left_x),
            _axis(gamepad.left_y, invert=True),
            _axis(gamepad.right_x),
            _axis(gamepad.right_y, invert=True),
        ],
        "buttons": [{"pressed": value, "value": int(value)} for value in pressed],
    }


def _xinput_get_state():
    for name in ("xinput1_4.dll", "xinput9_1_0.dll", "xinput1_3.dll"):
        try:
            function = ctypes.WinDLL(name).XInputGetState
        except OSError:
            continue
        function.argtypes = [DWORD, ctypes.POINTER(XInputState)]
        function.restype = DWORD
        return function
    raise OSError("Windows XInput is unavailable")


class GamepadReader:
    def __init__(self, get_state: Callable | None = None) -> None:
        self.get_state = get_state or _xinput_get_state()
        self.index: int | None = None
        self.pad: dict | None = None
        self.next_scan = 0.0

    def poll(self) -> None:
        if self.index is None:
            if time.monotonic() < self.next_scan:
                return
            self.next_scan = time.monotonic() + 1
            indices = range(4)
        else:
            indices = (self.index,)

        for index in indices:
            state = XInputState()
            if self.get_state(index, ctypes.byref(state)) == 0:
                self.index = index
                self.pad = gamepad_snapshot(state, index)
                return
        self.index = None
        self.pad = None
        self.next_scan = time.monotonic() + 1

    def snapshot(self) -> dict | None:
        return self.pad

    def close(self) -> None:
        self.index = None
        self.pad = None


class MouseInput(ctypes.Structure):
    _fields_ = [
        ("dx", LONG),
        ("dy", LONG),
        ("mouse_data", DWORD),
        ("flags", DWORD),
        ("time", DWORD),
        ("extra_info", ctypes.c_size_t),
    ]


class KeyboardInput(ctypes.Structure):
    _fields_ = [
        ("virtual_key", WORD),
        ("scan_code", WORD),
        ("flags", DWORD),
        ("time", DWORD),
        ("extra_info", ctypes.c_size_t),
    ]


class HardwareInput(ctypes.Structure):
    _fields_ = [
        ("message", DWORD),
        ("param_low", WORD),
        ("param_high", WORD),
    ]


class InputPayload(ctypes.Union):
    _fields_ = [
        ("mouse", MouseInput),
        ("keyboard", KeyboardInput),
        ("hardware", HardwareInput),
    ]


class Input(ctypes.Structure):
    _fields_ = [("type", DWORD), ("payload", InputPayload)]


KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
SPECIAL_KEYS = {
    "BACKSPACE": 0x08,
    "ENTER": 0x0D,
    "LEFT": 0x25,
    "UP": 0x26,
    "RIGHT": 0x27,
    "DOWN": 0x28,
}


def _key_event(virtual_key: int, scan_code: int, flags: int) -> Input:
    return Input(1, InputPayload(keyboard=KeyboardInput(
        virtual_key, scan_code, flags, 0, 0
    )))


def _send_input():
    function = ctypes.WinDLL("user32.dll", use_last_error=True).SendInput
    function.argtypes = [UINT, ctypes.POINTER(Input), ctypes.c_int]
    function.restype = UINT
    return function


class VirtualKeyboard:
    def __init__(self, send_input: Callable | None = None) -> None:
        self.send_input = send_input or _send_input()

    def press(self, character: str) -> None:
        if character in SPECIAL_KEYS:
            virtual_key = SPECIAL_KEYS[character]
            events = [
                _key_event(virtual_key, 0, 0),
                _key_event(virtual_key, 0, KEYEVENTF_KEYUP),
            ]
        elif len(character) == 1:
            events = []
            encoded = character.encode("utf-16-le")
            for offset in range(0, len(encoded), 2):
                scan_code = int.from_bytes(encoded[offset:offset + 2], "little")
                events.extend((
                    _key_event(0, scan_code, KEYEVENTF_UNICODE),
                    _key_event(0, scan_code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP),
                ))
        else:
            raise ValueError(f"Unsupported key {character!r}")

        batch = (Input * len(events))(*events)
        if self.send_input(len(events), batch, ctypes.sizeof(Input)) != len(events):
            error = getattr(ctypes, "get_last_error", lambda: 0)()
            raise OSError(error, "Windows rejected keyboard input")

    def close(self) -> None:
        pass
