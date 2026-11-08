export const typingTestPrompts = [
  "The quick brown fox jumps over the lazy dog.",
  "A small idea can grow into something useful.",
  "Practice makes each movement feel more natural.",
  "Two hands can share the work of writing a sentence.",
  "Clear words make a good story easy to follow.",
] as const;

export const typingTestPrompt = typingTestPrompts[0];

export function chooseTypingTestPrompt(): string {
  return typingTestPrompts[
    Math.floor(Math.random() * typingTestPrompts.length)
  ];
}

export type TypingTestResult = Readonly<{
  wordsPerMinute: number;
  characterAccuracy: number;
}>;

function editDistanceToPromptPrefix(typedText: string, prompt: string): number {
  let previousRow = Array.from(
    { length: prompt.length + 1 },
    (_, index) => index,
  );

  for (let typedIndex = 1; typedIndex <= typedText.length; typedIndex += 1) {
    const currentRow = new Array<number>(prompt.length + 1);
    currentRow[0] = typedIndex;

    for (let promptIndex = 1; promptIndex <= prompt.length; promptIndex += 1) {
      const substitutionCost =
        typedText[typedIndex - 1] === prompt[promptIndex - 1] ? 0 : 1;
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
  prompt: string,
): TypingTestResult {
  const errors = editDistanceToPromptPrefix(typedText, prompt);
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
