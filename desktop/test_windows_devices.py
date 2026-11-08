import ctypes
import unittest

from desktop.app import device_classes
from desktop.input_engine import InputEngine
from desktop.test_input_engine import FakeKeyboard, config
from desktop.windows_devices import (
    KEYEVENTF_KEYUP,
    KEYEVENTF_UNICODE,
    GamepadReader,
    Input,
    VirtualKeyboard,
    XInputGamepad,
    XInputState,
    gamepad_snapshot,
    generic_gamepad_snapshot,
)


class WindowsDeviceTests(unittest.TestCase):
    def test_windows_structures_match_win32_layout(self):
        self.assertEqual(ctypes.sizeof(XInputGamepad), 12)
        self.assertEqual(ctypes.sizeof(XInputState), 16)
        self.assertEqual(ctypes.sizeof(Input), 40 if ctypes.sizeof(ctypes.c_void_p) == 8 else 28)

    def test_xinput_controller_maps_to_standard_dials_and_buttons(self):
        state = XInputState()
        state.gamepad.left_x = -32768
        state.gamepad.left_y = 32767
        state.gamepad.right_x = 32767
        state.gamepad.right_y = -32768
        state.gamepad.buttons = 0x1000 | 0x0010 | 0x0001
        state.gamepad.left_trigger = 128
        pad = gamepad_snapshot(state, 0)
        self.assertEqual(pad["axes"], [-1.0, -1.0, 1.0, 1.0])
        self.assertEqual(
            [index for index, button in enumerate(pad["buttons"]) if button["pressed"]],
            [0, 6, 9, 12],
        )

    def test_generic_controller_maps_axes_buttons_and_hat(self):
        pad = generic_gamepad_snapshot(
            "DirectInput Controller",
            [-1.0, 0.5, 0.25, -0.75, 1.0, -1.0],
            [True, False, True, False, True, True],
            (1, -1),
        )
        self.assertEqual(pad["axes"], [-1.0, 0.5, 0.25, -0.75])
        self.assertEqual(
            [index for index, button in enumerate(pad["buttons"]) if button["pressed"]],
            [0, 2, 4, 5, 6, 13, 15],
        )

    def test_generic_bumpers_use_backspace_and_space_bindings(self):
        keyboard = FakeKeyboard()
        engine = InputEngine()
        engine.configure(config())
        engine.config["bindings"]["backspace"] = 4
        engine.set_keyboard(keyboard)

        base = generic_gamepad_snapshot("DirectInput Controller", [], [])
        left_bumper = generic_gamepad_snapshot(
            "DirectInput Controller", [], [False] * 4 + [True]
        )
        right_bumper = generic_gamepad_snapshot(
            "DirectInput Controller", [], [False] * 5 + [True]
        )
        engine.process(base, 0)
        engine.process(left_bumper, 0.1)
        engine.process(base, 0.2)
        engine.process(right_bumper, 0.3)
        self.assertEqual(keyboard.keys, ["BACKSPACE", " "])

    def test_generic_dpad_buttons_are_preserved(self):
        pad = generic_gamepad_snapshot(
            "SDL controller",
            [],
            [False] * 12 + [True, False, False, True],
        )
        self.assertTrue(pad["buttons"][12]["pressed"])
        self.assertTrue(pad["buttons"][15]["pressed"])

    def test_reader_falls_back_to_generic_controller(self):
        class FakeGeneric:
            def __init__(self):
                self.polled = False

            def poll(self):
                self.polled = True

            def snapshot(self):
                return {"id": "Generic", "buttons": [], "axes": []}

            def close(self):
                pass

        generic = FakeGeneric()
        reader = GamepadReader(
            lambda index, pointer: 1167,
            generic_reader_factory=lambda: generic,
        )
        reader.poll()
        self.assertTrue(generic.polled)
        self.assertEqual(reader.snapshot()["id"], "Generic")

    def test_reader_detects_and_releases_controller_without_changing_it(self):
        connected = True
        calls = []

        def get_state(index, pointer):
            calls.append(index)
            if not connected or index != 1:
                return 1167
            state = ctypes.cast(pointer, ctypes.POINTER(XInputState)).contents
            state.gamepad.buttons = 0x2000
            return 0

        reader = GamepadReader(get_state)
        reader.poll()
        self.assertEqual(calls, [0, 1])
        self.assertTrue(reader.snapshot()["buttons"][1]["pressed"])
        calls.clear()
        reader.poll()
        self.assertEqual(calls, [1])
        connected = False
        reader.poll()
        self.assertIsNone(reader.snapshot())

    def test_xinput_stick_return_sends_character_to_windows_keyboard(self):
        left_y = 0
        sent = []

        def get_state(index, pointer):
            if index != 0:
                return 1167
            state = ctypes.cast(pointer, ctypes.POINTER(XInputState)).contents
            state.gamepad.left_y = left_y
            return 0

        def send_input(count, events, size):
            sent.extend(events[index].payload.keyboard.scan_code for index in range(count))
            return count

        reader = GamepadReader(get_state)
        engine = InputEngine()
        engine.configure(config())
        engine.set_keyboard(VirtualKeyboard(send_input))
        reader.poll()
        engine.process(reader.snapshot(), 0)
        left_y = 32767
        reader.poll()
        engine.process(reader.snapshot(), 0.1)
        left_y = 0
        reader.poll()
        engine.process(reader.snapshot(), 0.2)
        self.assertEqual(sent, [ord("e"), ord("e")])

    def test_keyboard_sends_unicode_and_special_keys(self):
        sent = []

        def send_input(count, events, size):
            self.assertEqual(size, ctypes.sizeof(Input))
            sent.append([events[index].payload.keyboard for index in range(count)])
            return count

        keyboard = VirtualKeyboard(send_input)
        keyboard.press("A")
        self.assertEqual(
            [(event.virtual_key, event.scan_code, event.flags) for event in sent[-1]],
            [(0, ord("A"), KEYEVENTF_UNICODE),
             (0, ord("A"), KEYEVENTF_UNICODE | KEYEVENTF_KEYUP)],
        )
        keyboard.press("LEFT")
        self.assertEqual(
            [(event.virtual_key, event.flags) for event in sent[-1]],
            [(0x25, 0), (0x25, KEYEVENTF_KEYUP)],
        )

    def test_rejected_keyboard_output_is_reported(self):
        keyboard = VirtualKeyboard(lambda count, events, size: 0)
        with self.assertRaises(OSError):
            keyboard.press("x")

    def test_platform_selection_does_not_import_linux_backend_on_windows(self):
        reader, keyboard = device_classes("win32")
        self.assertIs(reader, GamepadReader)
        self.assertIs(keyboard, VirtualKeyboard)


if __name__ == "__main__":
    unittest.main()
