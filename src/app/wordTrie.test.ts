import { describe, expect, it } from "vitest";
import { WordTrie, parseFrequencyLine } from "./wordTrie";

describe("WordTrie", () => {
  it("returns the most frequent words for a prefix", () => {
    const trie = new WordTrie(2);
    trie.insert({ word: "cat", count: 10 });
    trie.insert({ word: "car", count: 30 });
    trie.insert({ word: "cart", count: 20 });

    expect(trie.search("ca")).toEqual([
      { word: "car", count: 30 },
      { word: "cart", count: 20 },
    ]);
  });

  it("parses valid CSV rows and rejects invalid rows", () => {
    expect(parseFrequencyLine("hello,42")).toEqual({
      word: "hello",
      count: 42,
    });
    expect(parseFrequencyLine("header,count")).toBeNull();
  });
});
