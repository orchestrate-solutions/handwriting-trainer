// js/history.js — Local progress history stored in localStorage
//
// Each entry is saved automatically when the user navigates away from a letter
// with at least one completed stroke (overall score > 0).
// Max 50 entries; oldest are pruned when the limit is reached.

const STORAGE_KEY = 'hw-trainer-history';
const MAX_ENTRIES = 50;

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id             — Unique ID (timestamp + random suffix)
 * @property {string} drill          — Drill id ('upper', 'lower', etc.)
 * @property {string} drillLabel     — Human-readable drill label ('A–Z')
 * @property {string} item           — The practiced item ('A', 'th', 'cat')
 * @property {string} font           — CSS font-family string used
 * @property {string} difficulty     — Difficulty id ('easy', 'medium', etc.)
 * @property {string} difficultyLabel— Human-readable difficulty label
 * @property {Object} score          — {accuracy, coverage, smoothness, overall}
 * @property {number} timestamp      — Unix ms
 * @property {string} imageDataUrl   — JPEG data URL of the canvas snapshot
 */

/** @returns {HistoryEntry[]} Entries sorted newest-first. */
export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

/**
 * Prepend an entry and enforce the max-entries cap.
 * Silently handles localStorage quota errors by halving the stored list.
 * @param {HistoryEntry} entry
 */
export function saveEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (_) {
    // Quota exceeded — drop the oldest half and retry
    history.splice(Math.floor(MAX_ENTRIES / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (_) {/* give up gracefully */}
  }
}

/** Remove all saved history entries. */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
