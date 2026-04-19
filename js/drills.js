// js/drills.js — Practice drill packs
// Each drill is a named set of items practiced in sequence.
// Items can be single characters, digraphs, or full words.

export const DRILLS = [
  {
    id: 'upper',
    label: 'A–Z',
    items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  },
  {
    id: 'lower',
    label: 'a–z',
    items: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  },
  {
    id: 'numbers',
    label: '0–9',
    items: '0123456789'.split(''),
  },
  {
    id: 'pairs',
    label: 'Pairs',
    // Common consonant digraphs and blends
    items: ['th', 'ch', 'sh', 'wh', 'ph', 'ng', 'ck', 'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sl', 'st', 'tr', 'tw'],
  },
  {
    id: 'words',
    label: 'Words',
    // Common high-frequency / sight words
    items: ['the', 'and', 'cat', 'dog', 'run', 'big', 'sun', 'hat', 'sit', 'cup', 'red', 'bed', 'log', 'bug', 'day', 'say', 'see', 'for', 'not', 'but', 'was', 'can', 'her', 'his', 'you', 'she', 'him', 'had', 'let', 'got'],
  },
];

/**
 * Custom drill — dynamically built from user-saved templates.
 * Items are populated at runtime from custom-templates.js storage.
 */
export const CUSTOM_DRILL = {
  id: 'custom',
  label: 'Custom',
  items: [],        // populated from saved templates at runtime
  isCustom: true,   // flag so app.js knows to handle differently
};

export const DEFAULT_DRILL = DRILLS[0];
