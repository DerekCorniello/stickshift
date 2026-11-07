import { describe, expect, it } from "vitest";
import { blankRun, runLimit, timedRunReducer } from "./useTimedRun";
import { typingTestPrompt } from "./typingTest";

describe("timed runs", () => {
  it("starts with the first insertion, not an empty backspace", () => {
    expect(
      timedRunReducer(blankRun, { kind: "backspace", now: 20 }).startedAt,
    ).toBeNull();
    expect(
      timedRunReducer(blankRun, { kind: "insert", value: "T", now: 30 })
        .startedAt,
    ).toBe(30);
  });
  it("requires the exact prompt and permits corrections at the target length", () => {
    let run = timedRunReducer(blankRun, {
      kind: "insert",
      value: typingTestPrompt.slice(0, -1) + "!",
      now: 10,
    });
    expect(run.result).toBeNull();
    run = timedRunReducer(run, { kind: "backspace", now: 1010 });
    run = timedRunReducer(run, { kind: "insert", value: ".", now: 2010 });
    expect(run.result).toEqual({
      elapsed: 2000,
      characterAccuracy: 100,
      wordsPerMinute: 264,
    });
  });
  it("scores early submission and ignores subsequent input", () => {
    let run = timedRunReducer(blankRun, {
      kind: "insert",
      value: "The q",
      now: 10,
    });
    run = timedRunReducer(run, { kind: "finish", now: 30010 });
    expect(run.result).toEqual({
      elapsed: 30000,
      characterAccuracy: 100,
      wordsPerMinute: 2,
    });
    expect(
      timedRunReducer(run, { kind: "insert", value: "x", now: 30020 }),
    ).toBe(run);
    expect(timedRunReducer(run, { kind: "reset" })).toEqual(blankRun);
  });
  it("caps time at two minutes and rejects input after the deadline", () => {
    const run = timedRunReducer(blankRun, {
      kind: "insert",
      value: "The",
      now: 10,
    });
    const timedOut = timedRunReducer(run, {
      kind: "tick",
      now: runLimit + 100,
    });
    expect(timedOut.result?.elapsed).toBe(runLimit);
    const lateInput = timedRunReducer(run, {
      kind: "insert",
      value: " x",
      now: runLimit + 100,
    });
    expect(lateInput.text).toBe("The");
    expect(lateInput.result).toEqual(timedOut.result);
  });
});
