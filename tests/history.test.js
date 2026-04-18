// Unit tests for history.js — localStorage-backed progress history
// jsdom provides localStorage, so no mocking needed.
import { describe, it, expect, beforeEach } from 'vitest';
import { saveEntry, getHistory, clearHistory } from '../js/history.js';

function makeEntry(override = {}) {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    drill: 'upper',
    drillLabel: 'A–Z',
    item: 'A',
    font: 'Georgia, serif',
    difficulty: 'medium',
    difficultyLabel: 'Medium',
    score: { accuracy: 0.8, coverage: 0.75, smoothness: 0.9, overall: 0.82 },
    timestamp: Date.now(),
    imageDataUrl: 'data:image/jpeg;base64,abc123',
    ...override,
  };
}

describe('getHistory', () => {
  beforeEach(() => clearHistory());

  it('returns empty array when nothing saved', () => {
    expect(getHistory()).toEqual([]);
  });

  it('returns entries after saving', () => {
    saveEntry(makeEntry({ item: 'A' }));
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].item).toBe('A');
  });
});

describe('saveEntry', () => {
  beforeEach(() => clearHistory());

  it('prepends entries (newest first)', () => {
    saveEntry(makeEntry({ item: 'A', timestamp: 1000 }));
    saveEntry(makeEntry({ item: 'B', timestamp: 2000 }));
    const history = getHistory();
    expect(history[0].item).toBe('B'); // newest first
    expect(history[1].item).toBe('A');
  });

  it('stores all required fields', () => {
    const entry = makeEntry();
    saveEntry(entry);
    const saved = getHistory()[0];
    expect(saved.drill).toBe(entry.drill);
    expect(saved.drillLabel).toBe(entry.drillLabel);
    expect(saved.item).toBe(entry.item);
    expect(saved.difficulty).toBe(entry.difficulty);
    expect(saved.score.overall).toBe(entry.score.overall);
    expect(saved.imageDataUrl).toBe(entry.imageDataUrl);
  });

  it('caps at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      saveEntry(makeEntry({ item: String(i) }));
    }
    expect(getHistory().length).toBeLessThanOrEqual(50);
  });
});

describe('clearHistory', () => {
  it('removes all entries', () => {
    saveEntry(makeEntry());
    saveEntry(makeEntry());
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});
