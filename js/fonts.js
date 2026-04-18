// js/fonts.js — Font management and template point extraction

/**
 * Preset fonts. `family` is a valid CSS font-family value.
 * System fonts are used by default (no loading required).
 */
export const FONT_PRESETS = [
  { label: 'Serif (default)', family: 'Georgia, serif' },
  { label: 'Cursive',         family: 'cursive' },
  { label: 'Monospace',       family: '"Courier New", monospace' },
  { label: 'Sans-Serif',      family: 'Arial, sans-serif' },
];

export const DEFAULT_FONT = FONT_PRESETS[0].family;

/** Name registered for user-uploaded fonts. */
export const CUSTOM_FONT_NAME = 'custom-hw-font';

// In-process point cache: key = `${letter}::${family}` → [x,y][]
const _cache = new Map();

/**
 * Extract template points for a letter rendered in the given CSS font-family.
 * Returns a flat array of [x, y] pairs in 0–100 coordinate space.
 *
 * Coordinate math: both extraction and DrawingCanvas._drawTemplate() use
 * the same SIZE_RATIO (0.80) and center positioning, so template points
 * align with the rendered guide at any letterScale.
 *
 * Results are cached; call clearFontCache() if the registered font changes.
 */
export function extractFontPoints(letter, fontFamily) {
  const key = `${letter}::${fontFamily}`;
  if (_cache.has(key)) return _cache.get(key);

  const SIZE = 400;  // render resolution (4× for quality)
  const STEP = 4;   // sample every STEP px → ~100×100 effective grid

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-fit: start at 80% of canvas height, shrink until text fits in 88% of width
  let fontSize = Math.round(SIZE * 0.80);
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(letter).width > SIZE * 0.88 && fontSize > 16) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
  }
  ctx.fillText(letter, SIZE / 2, SIZE / 2);

  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const points = [];

  for (let row = 0; row < SIZE; row += STEP) {
    for (let col = 0; col < SIZE; col += STEP) {
      if (data[(row * SIZE + col) * 4] > 128) {
        // Normalize pixel coord → 0–100 template space
        points.push([col / SIZE * 100, row / SIZE * 100]);
      }
    }
  }

  _cache.set(key, points);
  return points;
}

/**
 * Load a font file (.ttf / .otf / .woff / .woff2) and register it under
 * CUSTOM_FONT_NAME so it can be used immediately after the returned promise resolves.
 * Returns the CSS font-family string to pass to DrawingCanvas.setFont().
 */
export async function loadCustomFont(file) {
  const url = URL.createObjectURL(file);
  const font = new FontFace(CUSTOM_FONT_NAME, `url(${url})`);
  await font.load();
  document.fonts.add(font);

  // Invalidate any cached points for the old custom font
  for (const key of _cache.keys()) {
    if (key.includes(CUSTOM_FONT_NAME)) _cache.delete(key);
  }

  return `"${CUSTOM_FONT_NAME}", cursive`;
}

/** Flush the entire point cache (e.g., when the active font changes). */
export function clearFontCache() {
  _cache.clear();
}
