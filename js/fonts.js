// js/fonts.js — Font management and template point extraction

/**
 * Preset fonts. `family` is a valid CSS font-family value.
 * System fonts are used by default (no loading required).
 */
export const FONT_PRESETS = [
  { label: 'Serif (default)',   family: 'Georgia, serif' },
  // Natural handwriting-style fonts (system fonts — vary by OS)
  { label: 'Comic Sans',        family: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Bradley Hand',      family: '"Bradley Hand ITC", "Bradley Hand", cursive' },
  { label: 'Chalkboard',        family: '"Chalkboard SE", "Chalkboard", cursive' },
  // Print / technical
  { label: 'Cursive',           family: 'cursive' },
  { label: 'Sans-Serif',        family: 'Arial, sans-serif' },
  { label: 'Monospace',         family: '"Courier New", monospace' },
];

export const DEFAULT_FONT = FONT_PRESETS[0].family;

/**
 * Return only the presets whose primary font face actually renders in this browser.
 * Falls through the CSS fallback stack internally, but we only show it if the
 * named font (not the generic fallback) is actually available.
 */
export function getAvailableFonts() {
  if (typeof document === 'undefined') return FONT_PRESETS;
  return FONT_PRESETS.filter(preset => {
    // Generic families like 'cursive' always "resolve" — keep them
    const generic = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'];
    const family = preset.family.trim();
    if (generic.includes(family)) return true;
    // Extract the first quoted or unquoted name
    const match = family.match(/^"([^"]+)"|^([^,]+)/);
    const name = (match[1] || match[2] || '').trim();
    if (!name) return true;
    return document.fonts.check(`16px "${name}"`);
  });
}

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

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-fit: start at 80% of canvas height, shrink until text fits in 88% of width
  let fontSize = Math.round(SIZE * 0.80);
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  while (ctx.measureText(letter).width > SIZE * 0.88 && fontSize > 16) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
  }

  // Use strokeText to extract the outline/centerline — thinner target area
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, fontSize * 0.04);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeText(letter, SIZE / 2, SIZE / 2);

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
