export type WordFrequency = Readonly<{
  word: string;
  count: number;
}>;

type TrieNode = {
  children: Map<string, TrieNode>;
  suggestions: WordFrequency[];
};

export class WordTrie {
  private readonly root: TrieNode = {
    children: new Map(),
    suggestions: [],
  };

  constructor(private readonly maxSuggestions = 8) {}

  insert(entry: WordFrequency): void {
    const word = entry.word.trim().toLowerCase();
    if (!word) {
      return;
    }

    let node = this.root;
    for (const character of word) {
      let child = node.children.get(character);
      if (!child) {
        child = { children: new Map(), suggestions: [] };
        node.children.set(character, child);
      }
      node = child;
      this.addSuggestion(node, { word, count: entry.count });
    }
  }

  search(prefix: string): WordFrequency[] {
    let node = this.root;
    for (const character of prefix.trim().toLowerCase()) {
      const child = node.children.get(character);
      if (!child) {
        return [];
      }
      node = child;
    }
    return [...node.suggestions];
  }

  private addSuggestion(node: TrieNode, entry: WordFrequency): void {
    const existingIndex = node.suggestions.findIndex(
      (suggestion) => suggestion.word === entry.word,
    );
    if (existingIndex >= 0) {
      node.suggestions.splice(existingIndex, 1);
    }

    const insertionIndex = node.suggestions.findIndex(
      (suggestion) => suggestion.count < entry.count,
    );
    if (insertionIndex < 0) {
      node.suggestions.push(entry);
    } else {
      node.suggestions.splice(insertionIndex, 0, entry);
    }
    node.suggestions.length = Math.min(
      node.suggestions.length,
      this.maxSuggestions,
    );
  }
}

export function parseFrequencyLine(line: string): WordFrequency | null {
  const [word, countText] = line.split(",");
  const count = Number(countText);
  if (!word || !Number.isFinite(count)) {
    return null;
  }
  return { word, count };
}
