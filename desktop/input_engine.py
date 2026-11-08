"""Controller-to-keyboard behavior shared by the desktop runtime and tests."""

from __future__ import annotations

import math
import csv
import time
from typing import Protocol


class Keyboard(Protocol):
    def press(self, key: str) -> None: ...

    def close(self) -> None: ...


class WordTrie:
    def __init__(self, path: str, max_words: int = 100_000, limit: int = 5):
        self.root: dict = {"children": {}, "suggestions": []}
        with open(path, encoding="utf-8", newline="") as source:
            for count, row in enumerate(csv.DictReader(source)):
                if count >= max_words:
                    break
                word = row.get("word", "").strip().lower()
                if not word:
                    continue
                try:
                    frequency = int(row.get("count", "0"))
                except ValueError:
                    continue
                node = self.root
                for character in word:
                    node = node["children"].setdefault(
                        character, {"children": {}, "suggestions": []}
                    )
                    suggestions = node["suggestions"]
                    suggestions.append((word, frequency))
                    suggestions.sort(key=lambda entry: entry[1], reverse=True)
                    del suggestions[limit:]

    def search(self, prefix: str) -> list[str]:
        node = self.root
        for character in prefix.lower():
            node = node["children"].get(character)
            if node is None:
                return []
        return [word for word, _ in node["suggestions"]]


class InputEngine:
    def __init__(self) -> None:
        self.config: dict | None = None
        self.keyboard: Keyboard | None = None
        self.previous_buttons: list[bool] = []
        self.outside = {"left": False, "right": False}
        self.candidate: dict[str, tuple[int, str] | None] = {
            "left": None,
            "right": None,
        }
        self.cancelled = {"left": False, "right": False}
        self.repeat_after: dict[str, float] = {}
        self.word_trie: WordTrie | None = None
        self.word_buffer = ""
        self.autocomplete_active = False
        self.suggestions: list[str] = []
        self.selected_suggestion = 0

    def set_word_trie(self, trie: WordTrie) -> None:
        self.word_trie = trie
        self._refresh_suggestions()

    @property
    def enabled(self) -> bool:
        return self.keyboard is not None

    def configure(self, config: dict) -> None:
        layout = config.get("layout")
        if not isinstance(layout, dict) or not all(
            isinstance(layout.get(side, {}).get("layers"), list)
            for side in ("left", "right")
        ):
            raise ValueError("Invalid dial layout")
        if not isinstance(config.get("bindings"), dict):
            raise ValueError("Invalid button bindings")
        self.config = config

    def set_keyboard(self, keyboard: Keyboard | None) -> None:
        if self.keyboard is not None:
            self.keyboard.close()
        self.keyboard = keyboard
        self.candidate = {"left": None, "right": None}
        self.cancelled = {"left": False, "right": False}
        self.repeat_after.clear()

    def process(self, pad: dict | None, now: float | None = None) -> None:
        now = time.monotonic() if now is None else now
        if pad is None:
            self.previous_buttons = []
            self.candidate = {"left": None, "right": None}
            self.outside = {"left": False, "right": False}
            return

        buttons = [bool(button["pressed"]) for button in pad["buttons"]]
        if not self.enabled or self.config is None:
            self.previous_buttons = buttons
            self.candidate = {"left": None, "right": None}
            self.outside = {"left": False, "right": False}
            return

        bindings = self.config["bindings"]
        for action, index in bindings.items():
            if not isinstance(index, int) or index >= len(buttons):
                continue
            pressed = buttons[index]
            was_pressed = (
                self.previous_buttons[index]
                if index < len(self.previous_buttons)
                else False
            )
            if pressed and not was_pressed:
                self._button_press(action, now)
            if not pressed:
                self.repeat_after.pop(action, None)

        for action in ("backspace", "space", "enter"):
            index = bindings.get(action)
            if isinstance(index, int) and index < len(buttons) and buttons[index]:
                deadline = self.repeat_after.get(action)
                if deadline is not None and now >= deadline:
                    self._write_action(action)
                    self.repeat_after[action] = now + 0.09

        self.previous_buttons = buttons
        for side in ("left", "right"):
            self._update_stick(side, pad["axes"])

    def _button_press(self, action: str, now: float) -> None:
        if action == "autocomplete":
            self.autocomplete_active = not self.autocomplete_active
            self.selected_suggestion = 0
            self._refresh_suggestions()
        elif action == "close" and self.autocomplete_active:
            self.autocomplete_active = False
        elif self.autocomplete_active and action in (
            "cursorUp", "cursorLeft"
        ):
            self._move_suggestion(-1)
        elif self.autocomplete_active and action in (
            "cursorDown", "cursorRight"
        ):
            self._move_suggestion(1)
        elif self.autocomplete_active and action in ("enter", "submit"):
            self._accept_suggestion()
        elif action in ("previousLayer", "nextLayer"):
            layers = self.config["layout"]["left"]["layers"]
            ids = [layer["id"] for layer in layers]
            current = self.config["activeLayerId"]
            index = ids.index(current) if current in ids else 0
            step = -1 if action == "previousLayer" else 1
            self.config["activeLayerId"] = ids[(index + step) % len(ids)]
        elif action in ("commitLeft", "commitRight"):
            side = "left" if action == "commitLeft" else "right"
            if self.outside[side]:
                self.cancelled[side] = True
        else:
            self._write_action(action)
            if action in ("backspace", "space", "enter"):
                self.repeat_after[action] = now + 0.4

    def _write_action(self, action: str) -> None:
        if self.autocomplete_active and action in (
            "cursorLeft", "cursorRight", "cursorUp", "cursorDown", "enter"
        ):
            return
        key = {
            "backspace": "BACKSPACE",
            "space": " ",
            "enter": "ENTER",
            "cursorLeft": "LEFT",
            "cursorRight": "RIGHT",
            "cursorUp": "UP",
            "cursorDown": "DOWN",
        }.get(action)
        if key is not None and self.keyboard is not None:
            self.keyboard.press(key)
            if action == "backspace":
                self.word_buffer = self.word_buffer[:-1]
                self._refresh_suggestions()
            elif action in ("space", "enter"):
                self.word_buffer = ""
                self._refresh_suggestions()
            elif action.startswith("cursor"):
                self.word_buffer = ""
                self._refresh_suggestions()

    def _type_character(self, character: str) -> None:
        if self.keyboard is None:
            return
        self.keyboard.press(character)
        if character.isalnum() or character in "'-":
            self.word_buffer += character
        else:
            self.word_buffer = ""
        self._refresh_suggestions()

    def _refresh_suggestions(self) -> None:
        self.suggestions = (
            self.word_trie.search(self.word_buffer)
            if self.word_trie is not None and self.word_buffer
            else []
        )
        self.selected_suggestion = min(
            self.selected_suggestion, max(0, len(self.suggestions) - 1)
        )

    def _move_suggestion(self, direction: int) -> None:
        if self.suggestions:
            self.selected_suggestion = (
                self.selected_suggestion + direction
            ) % len(self.suggestions)

    def _accept_suggestion(self) -> None:
        if not self.suggestions or self.keyboard is None:
            self.autocomplete_active = False
            return
        word = self.suggestions[self.selected_suggestion]
        for _ in self.word_buffer:
            self.keyboard.press("BACKSPACE")
        for character in word:
            self.keyboard.press(character)
        self.keyboard.press(" ")
        self.word_buffer = ""
        self.autocomplete_active = False
        self._refresh_suggestions()

    def autocomplete_status(self) -> dict:
        return {
            "active": self.autocomplete_active,
            "word": self.word_buffer,
            "suggestions": self.suggestions,
            "selectedIndex": self.selected_suggestion,
        }

    def _update_stick(self, side: str, axes: list[float]) -> None:
        mapping = self.config[f"{side}Mapping"]
        x = axes[mapping["xAxis"]] if mapping["xAxis"] < len(axes) else 0
        y = axes[mapping["yAxis"]] if mapping["yAxis"] < len(axes) else 0
        if mapping["invertX"]:
            x = -x
        if mapping["invertY"]:
            y = -y
        outside = math.hypot(x, y) > self.config["deadzone"]
        if not outside:
            if self.outside[side] and not self.cancelled[side]:
                candidate = self.candidate[side]
                if candidate is not None and self.keyboard is not None:
                    self._type_character(candidate[1])
            self.outside[side] = False
            self.candidate[side] = None
            self.cancelled[side] = False
            return

        layers = self.config["layout"][side]["layers"]
        layer = next(
            (item for item in layers if item["id"] == self.config["activeLayerId"]),
            None,
        )
        if layer is None or not layer["slices"]:
            return
        count = len(layer["slices"])
        sweep = 2 * math.pi / count
        angle = math.atan2(x, -y) % (2 * math.pi)
        index = math.floor((angle + sweep / 2) / sweep) % count
        previous = self.candidate[side]
        if self.outside[side] and previous is not None:
            previous_index = previous[0]
            if previous_index != index:
                center = previous_index * sweep
                distance = ((angle - center + 3 * math.pi) % (2 * math.pi)) - math.pi
                if abs(distance) <= sweep * 0.65:
                    index = previous_index
        self.outside[side] = True
        self.candidate[side] = (index, layer["slices"][index]["character"])
