import { useCallback, useEffect, useReducer } from "react";
import {
  scoreTypingTest,
  typingTestPrompt,
  type TypingTestResult,
} from "./typingTest";

export const runLimit = 120_000;
export type RunResult = TypingTestResult & Readonly<{ elapsed: number }>;
export type TimedRun = Readonly<{
  prompt: string;
  text: string;
  startedAt: number | null;
  elapsed: number;
  result: RunResult | null;
}>;
export const blankRun: TimedRun = {
  prompt: typingTestPrompt,
  text: "",
  startedAt: null,
  elapsed: 0,
  result: null,
};
export type RunAction =
  | { kind: "insert"; value: string; now: number }
  | { kind: "backspace"; now: number }
  | { kind: "finish"; now: number }
  | { kind: "tick"; now: number }
  | { kind: "reset"; prompt: string };

export function scoreRun(run: TimedRun, elapsed = run.elapsed): RunResult {
  return { ...scoreTypingTest(run.text, elapsed, run.prompt), elapsed };
}

export function timedRunReducer(run: TimedRun, action: RunAction): TimedRun {
  if (action.kind === "reset") return { ...blankRun, prompt: action.prompt };
  if (run.result) return run;
  const elapsed =
    run.startedAt === null
      ? 0
      : Math.min(runLimit, Math.max(0, action.now - run.startedAt));
  if (
    action.kind === "finish" ||
    (run.startedAt !== null && elapsed >= runLimit)
  ) {
    return { ...run, elapsed, result: scoreRun(run, elapsed) };
  }
  if (action.kind === "tick") return { ...run, elapsed };
  const text =
    action.kind === "backspace"
      ? run.text.slice(0, -1)
      : run.text + action.value;
  const startedAt = run.startedAt ?? (text.length > 0 ? action.now : null);
  const next = { ...run, text, startedAt, elapsed };
  return text === run.prompt ? { ...next, result: scoreRun(next) } : next;
}

export function useTimedRun(prompt: string) {
  const [run, dispatch] = useReducer(timedRunReducer, {
    ...blankRun,
    prompt,
  });
  useEffect(() => {
    if (run.startedAt === null || run.result) return;
    const interval = window.setInterval(
      () => dispatch({ kind: "tick", now: performance.now() }),
      100,
    );
    return () => window.clearInterval(interval);
  }, [run.startedAt, run.result]);
  const insert = useCallback(
    (value: string) =>
      dispatch({ kind: "insert", value, now: performance.now() }),
    [],
  );
  const backspace = useCallback(
    () => dispatch({ kind: "backspace", now: performance.now() }),
    [],
  );
  const finish = useCallback(
    () => dispatch({ kind: "finish", now: performance.now() }),
    [],
  );
  const reset = useCallback(
    (nextPrompt: string) => dispatch({ kind: "reset", prompt: nextPrompt }),
    [],
  );
  return { run, insert, backspace, finish, reset };
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
