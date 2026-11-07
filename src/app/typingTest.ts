export const typingTestPrompt = "the quick brown fox jumps over the lazy dog";

export type TypingTestResult = Readonly<{
  wordsPerMinute: number;
  characterAccuracy: number;
}>;

function editDistanceToPromptPrefix(typedText: string): number {
  let previousRow = Array.from(
    { length: typingTestPrompt.length + 1 },
    (_, index) => index,
  );

  for (let typedIndex = 1; typedIndex <= typedText.length; typedIndex += 1) {
    const currentRow = new Array<number>(typingTestPrompt.length + 1);
    currentRow[0] = typedIndex;

    for (
      let promptIndex = 1;
      promptIndex <= typingTestPrompt.length;
      promptIndex += 1
    ) {
      const substitutionCost =
        typedText[typedIndex - 1] === typingTestPrompt[promptIndex - 1] ? 0 : 1;
      currentRow[promptIndex] = Math.min(
        currentRow[promptIndex - 1] + 1,
        previousRow[promptIndex] + 1,
        previousRow[promptIndex - 1] + substitutionCost,
      );
    }

    previousRow = currentRow;
  }

  return Math.min(...previousRow);
}

export function scoreTypingTest(
  typedText: string,
  elapsedMilliseconds: number,
): TypingTestResult {
  const errors = editDistanceToPromptPrefix(typedText);
  const correctlyEnteredCharacters = Math.max(typedText.length - errors, 0);
  const elapsedMinutes = Math.max(elapsedMilliseconds, 1) / 60_000;
  return {
    wordsPerMinute:
      Math.round((correctlyEnteredCharacters / 5 / elapsedMinutes) * 10) / 10,
    characterAccuracy:
      typedText.length === 0
        ? 100
        : Math.round(
            (Math.max(typedText.length - errors, 0) / typedText.length) * 1000,
          ) / 10,
  };
}
