"""Build the browser dictionary from the frequency-sorted source data."""
import csv
import heapq
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 100_000


def entries():
    with (ROOT / 'src/data/ngram_freq_filtered.csv').open() as source:
        for row in csv.reader(source):
            if len(row) != 2:
                continue
            word, raw_count = row
            try:
                count = int(raw_count)
            except ValueError:
                continue
            if word and count > 0:
                yield (count, word)


with (ROOT / 'src/data/autocomplete.csv').open('w') as target:
    writer = csv.writer(target, lineterminator='\n')
    writer.writerow(('word', 'count'))
    for count, word in heapq.nlargest(LIMIT, entries()):
        writer.writerow((word, count))
