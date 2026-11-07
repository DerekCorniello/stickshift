import frequencyCsvUrl from "../data/autocomplete.csv?url";
import { parseFrequencyLine, WordTrie } from "./wordTrie";

const tries = new Map<string, Promise<WordTrie>>();
let dictionary: Promise<string> | undefined;

export function buildWordTrie(
  csv: string,
  maxWords: number,
  maxSuggestions: number,
): WordTrie {
  const trie = new WordTrie(maxSuggestions);
  let count = 0;
  for (const line of csv.split(/\r?\n/)) {
    if (count >= maxWords) break;
    const entry = parseFrequencyLine(line);
    if (!entry) continue;
    trie.insert(entry);
    count += 1;
  }
  return trie;
}

export function loadWordTrie(
  maxWords: number,
  maxSuggestions: number,
): Promise<WordTrie> {
  const key = `${maxWords}:${maxSuggestions}`;
  const existing = tries.get(key);
  if (existing) return existing;
  dictionary ??= fetch(frequencyCsvUrl)
    .then((response) => {
      if (!response.ok)
        throw new Error(
          `Unable to load word frequency data (${response.status})`,
        );
      return response.text();
    })
    .catch((error: unknown) => {
      dictionary = undefined;
      throw error;
    });
  const pending = dictionary
    .then((csv) => buildWordTrie(csv, maxWords, maxSuggestions))
    .catch((error: unknown) => {
      tries.delete(key);
      throw error;
    });
  tries.set(key, pending);
  return pending;
}
