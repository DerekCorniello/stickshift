import { describe, expect, it } from "vitest";
import { scoreTypingTest, typingTestPrompt } from "./typingTest";

describe("typing test scoring", () => {
  it("reports perfect accuracy for the completed prompt", () => {
    expect(scoreTypingTest(typingTestPrompt, 60_000)).toEqual({
      wordsPerMinute: 8.6,
      characterAccuracy: 100,
    });
  });

  it("counts matching characters and calculates speed from typed characters", () => {
    expect(scoreTypingTest("the q", 30_000)).toEqual({
      wordsPerMinute: 2,
      characterAccuracy: 100,
    });
    expect(scoreTypingTest("the x", 30_000).characterAccuracy).toBe(80);
  });

  it("counts a missing space once without shifting all following characters", () => {
    expect(
      scoreTypingTest("thequick brown fox", 60_000).characterAccuracy,
    ).toBe(94.4);
  });
});
