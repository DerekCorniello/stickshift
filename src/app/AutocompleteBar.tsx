import { useEffect, useMemo, useState } from "react";
import type { Ref } from "react";
import frequencyCsvUrl from "../data/ngram_freq_filtered.csv?url";
import { parseFrequencyLine, WordTrie, type WordFrequency } from "./wordTrie";
import "./autocompleteBar.css";

type AutocompleteBarProps = Readonly<{
  value?: string;
  onChange?: (value: string) => void;
  maxWords?: number;
  maxSuggestions?: number;
  onSelect?: (word: string) => void;
  readOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  selectionActive?: boolean;
  selectedSuggestionIndex?: number;
  onSuggestionsChange?: (suggestions: readonly string[]) => void;
  label?: string;
}>;

const defaultMaxWords = 100_000;

async function loadWordTrie(
  maxWords: number,
  maxSuggestions: number,
  signal: AbortSignal,
): Promise<WordTrie> {
  const response = await fetch(frequencyCsvUrl, { signal });
  if (!response.ok || !response.body) {
    throw new Error(`Unable to load word frequency data (${response.status})`);
  }

  const trie = new WordTrie(maxSuggestions);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let remainder = "";
  let loadedWords = 0;

  while (loadedWords < maxWords) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    remainder += value;
    const lines = remainder.split(/\r?\n/);
    remainder = lines.pop() ?? "";

    for (const line of lines) {
      const entry = parseFrequencyLine(line);
      if (entry) {
        trie.insert(entry);
        loadedWords += 1;
        if (loadedWords >= maxWords) {
          break;
        }
      }
    }
  }

  await reader.cancel();
  return trie;
}

export function AutocompleteBar({
  value,
  onChange,
  maxWords = defaultMaxWords,
  maxSuggestions = 5,
  onSelect,
  readOnly = false,
  inputRef,
  selectionActive = false,
  selectedSuggestionIndex = 0,
  onSuggestionsChange,
  label = "Type a word",
}: AutocompleteBarProps) {
  const [trie, setTrie] = useState<WordTrie | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [internalQuery, setInternalQuery] = useState("");
  const query = value ?? internalQuery;

  useEffect(() => {
    const controller = new AbortController();

    loadWordTrie(maxWords, maxSuggestions, controller.signal)
      .then((loadedTrie) => {
        setTrie(loadedTrie);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load word frequency data", error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [maxSuggestions, maxWords]);

  const suggestions = useMemo<WordFrequency[]>(
    () => (trie && query.length > 0 ? trie.search(query) : []),
    [query, trie],
  );
  const suggestionWords = useMemo(
    () => suggestions.map((suggestion) => suggestion.word),
    [suggestions],
  );

  useEffect(() => {
    onSuggestionsChange?.(suggestionWords);
  }, [onSuggestionsChange, suggestionWords]);

  const selectWord = (word: string) => {
    if (onSelect) {
      onSelect(word);
    } else {
      onChange?.(word);
    }
    if (value === undefined) {
      setInternalQuery(word);
    }
  };

  const updateQuery = (nextQuery: string) => {
    onChange?.(nextQuery);
    if (value === undefined) {
      setInternalQuery(nextQuery);
    }
  };

  return (
    <section className="autocomplete" aria-label="Word autocomplete">
      <label className="autocomplete__label" htmlFor="word-autocomplete">
        {label}
      </label>
      <input
        ref={inputRef}
        id="word-autocomplete"
        className="autocomplete__input"
        value={query}
        onChange={(event) => updateQuery(event.target.value)}
        readOnly={readOnly}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls="word-suggestions"
        aria-activedescendant={
          selectionActive && suggestionWords[selectedSuggestionIndex]
            ? `word-suggestion-${selectedSuggestionIndex}`
            : undefined
        }
        placeholder={
          status === "loading" ? "Loading word list..." : "Start typing..."
        }
      />
      {status === "error" && (
        <p className="autocomplete__message" role="alert">
          The word list could not be loaded.
        </p>
      )}
      {suggestions.length > 0 && (
        <div
          id="word-suggestions"
          className="autocomplete__suggestions"
          role="listbox"
          aria-label="Word suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.word}
              id={`word-suggestion-${index}`}
              type="button"
              role="option"
              aria-selected={
                selectionActive && index === selectedSuggestionIndex
              }
              onClick={() => selectWord(suggestion.word)}
            >
              {suggestion.word}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
