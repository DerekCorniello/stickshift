import { describe, expect, it, vi } from "vitest";
import {
  chooseTypingTestPrompt,
  scoreTypingTest,
  typingTestPrompt,
  typingTestPrompts,
} from "./typingTest";

describe("typing test scoring", () => {
  it("chooses from the prompt pool", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.9);
    expect(chooseTypingTestPrompt()).toBe(typingTestPrompts[4]);
    random.mockRestore();
  });

  it("scores the chosen prompt rather than the original sentence", () => {
    const prompt = typingTestPrompts[1];
    expect(scoreTypingTest(prompt, 60_000, prompt).characterAccuracy).toBe(100);
    expect(
      scoreTypingTest(typingTestPrompt, 60_000, prompt).characterAccuracy,
    ).toBeLessThan(100);
  });
  it("reports perfect accuracy for the completed prompt", () => {
    expect(scoreTypingTest(typingTestPrompt, 60_000, typingTestPrompt)).toEqual(
      {
        wordsPerMinute: 8.8,
        characterAccuracy: 100,
      },
    );
  });

  it("counts matching characters and calculates speed from typed characters", () => {
    expect(scoreTypingTest("The q", 30_000, typingTestPrompt)).toEqual({
      wordsPerMinute: 2,
      characterAccuracy: 100,
    });
    expect(
      scoreTypingTest("The x", 30_000, typingTestPrompt).characterAccuracy,
    ).toBe(80);
  });

  it("counts a missing space once without shifting all following characters", () => {
    expect(
      scoreTypingTest("Thequick brown fox", 60_000, typingTestPrompt)
        .characterAccuracy,
    ).toBe(94.4);
  });
});
