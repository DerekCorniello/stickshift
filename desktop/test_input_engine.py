import unittest
import sys

from desktop.input_engine import InputEngine


class FakeKeyboard:
    def __init__(self):
        self.keys = []
        self.closed = False

    def press(self, key):
        self.keys.append(key)

    def close(self):
        self.closed = True


def pad(left_x=0, left_y=0, right_x=0, right_y=0, pressed=()):
    return {
        "axes": [left_x, left_y, right_x, right_y],
        "buttons": [
            {"pressed": index in pressed, "value": int(index in pressed)}
            for index in range(16)
        ],
    }


def config():
    return {
        "layout": {
            "left": {"layers": [
                {"id": "lowercase", "slices": [{"character": "e"}, {"character": "a"}]},
                {"id": "uppercase", "slices": [{"character": "E"}, {"character": "A"}]},
            ]},
            "right": {"layers": [
                {"id": "lowercase", "slices": [{"character": "t"}, {"character": "o"}]},
                {"id": "uppercase", "slices": [{"character": "T"}, {"character": "O"}]},
            ]},
        },
        "bindings": {"nextLayer": 7, "space": 5, "commitLeft": 10},
        "activeLayerId": "lowercase",
        "leftMapping": {"xAxis": 0, "yAxis": 1, "invertX": False, "invertY": False},
        "rightMapping": {"xAxis": 2, "yAxis": 3, "invertX": False, "invertY": False},
        "deadzone": 0.2,
    }


class InputEngineTests(unittest.TestCase):
    def setUp(self):
        self.engine = InputEngine()
        self.engine.configure(config())
        self.keyboard = FakeKeyboard()
        self.engine.set_keyboard(self.keyboard)

    def test_types_on_return_to_center(self):
        self.engine.process(pad(), 0)
        self.engine.process(pad(left_y=-1, right_y=-1), 0.1)
        self.engine.process(pad(), 0.2)
        self.assertEqual(self.keyboard.keys, ["e", "t"])

    def test_stick_click_cancels_only_that_stick(self):
        self.engine.process(pad(), 0)
        self.engine.process(pad(left_y=-1, right_y=-1), 0.1)
        self.engine.process(pad(left_y=-1, right_y=-1, pressed=(10,)), 0.2)
        self.engine.process(pad(), 0.3)
        self.assertEqual(self.keyboard.keys, ["t"])

    def test_layer_and_button_mapping(self):
        self.engine.process(pad(), 0)
        self.engine.process(pad(pressed=(7,)), 0.1)
        self.engine.process(pad(left_y=-1, pressed=(5,)), 0.2)
        self.engine.process(pad(), 0.3)
        self.assertEqual(self.keyboard.keys, [" ", "E"])

    def test_disabled_engine_emits_nothing(self):
        self.engine.set_keyboard(None)
        self.engine.process(pad(left_y=-1), 0.1)
        self.engine.process(pad(), 0.2)
        self.assertEqual(self.keyboard.keys, [])
        self.assertTrue(self.keyboard.closed)

    def test_config_page_pauses_typing_and_clears_pending_selection(self):
        self.engine.process(pad(left_y=-1), 0.1)
        paused = config()
        paused["typingEnabled"] = False
        self.engine.configure(paused)
        self.engine.process(pad(left_y=-1, pressed=(5,)), 0.2)
        self.engine.process(pad(), 0.3)
        self.assertEqual(self.keyboard.keys, [])

        resumed = config()
        resumed["typingEnabled"] = True
        self.engine.configure(resumed)
        self.engine.process(pad(), 0.4)
        self.engine.process(pad(left_y=-1), 0.5)
        self.engine.process(pad(), 0.6)
        self.assertEqual(self.keyboard.keys, ["e"])

    def test_unassigned_slice_does_not_send_an_empty_key(self):
        incomplete = config()
        incomplete["layout"]["left"]["layers"][0]["slices"][0]["character"] = ""
        self.engine.configure(incomplete)
        self.engine.process(pad(left_y=-1), 0.1)
        self.engine.process(pad(), 0.2)
        self.assertEqual(self.keyboard.keys, [])

    def test_first_suggestion_shortcut_works_without_selection_mode(self):
        shortcut = config()
        shortcut["bindings"]["acceptFirstSuggestion"] = 1
        self.engine.configure(shortcut)
        self.engine.word_buffer = "th"
        self.engine.suggestions = ["there", "then"]
        self.engine.selected_suggestion = 1
        self.engine.process(pad(pressed=(1,)), 0.1)
        self.assertEqual(
            self.keyboard.keys,
            ["BACKSPACE", "BACKSPACE", "t", "h", "e", "r", "e", " "],
        )
        self.assertFalse(self.engine.autocomplete_active)

    @unittest.skipUnless(sys.platform == "linux", "Linux evdev test")
    def test_ascii_mapping(self):
        from desktop.linux_devices import key_for_character, normalize_axis

        for codepoint in range(33, 127):
            key_for_character(chr(codepoint))
        self.assertEqual(key_for_character("a")[1], False)
        self.assertEqual(key_for_character("A")[1], True)
        self.assertEqual(key_for_character("!")[1], True)
        self.assertEqual(key_for_character("?")[1], True)
        self.assertEqual(normalize_axis(0, 0, 255), -1)
        self.assertEqual(normalize_axis(255, 0, 255), 1)


if __name__ == "__main__":
    unittest.main()
