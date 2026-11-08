import { describe, expect, it } from "vitest";
import { buildWordTrie } from "./wordDictionary";

describe("browser dictionary", () => {
  it("includes the final row without a newline and ranks by frequency", () => {
    const trie = buildWordTrie("word,count\nthen,5\nthere,10", 100, 5);
    expect(trie.search("th").map((entry) => entry.word)).toEqual([
      "there",
      "then",
    ]);
  });

  it("counts valid entries toward the requested limit", () => {
    const trie = buildWordTrie(
      "word,count\ninvalid,no\nthen,5\nthere,10",
      1,
      5,
    );
    expect(trie.search("th").map((entry) => entry.word)).toEqual(["then"]);
  });
});
