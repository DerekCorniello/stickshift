export const typingTestPrompt = "the quick brown fox jumps over the lazy dog";

export type TypingTestResult = Readonly<{
  wordsPerMinute: number;
  characterAccuracy: number;
}>;

export function scoreTypingTest(
  typedText: string,
  elapsedMilliseconds: number,
): TypingTestResult {
  const comparedLength = Math.min(typedText.length, typingTestPrompt.length);
  let correctCharacters = 0;

  for (let index = 0; index < comparedLength; index += 1) {
    if (typedText[index] === typingTestPrompt[index]) {
      correctCharacters += 1;
    }
  }

  const elapsedMinutes = Math.max(elapsedMilliseconds, 1) / 60_000;
  return {
    wordsPerMinute:
      Math.round((typedText.length / 5 / elapsedMinutes) * 10) / 10,
    characterAccuracy:
      typedText.length === 0
        ? 100
        : Math.round((correctCharacters / typedText.length) * 1000) / 10,
  };
}
