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
 * Zhang-Suen thinning — reduce a binary image to a 1-pixel-wide skeleton.
 * Operates in-place on a Uint8Array of 0/1 values (width × height).
 * Returns the same array, mutated.
 */
function thinZhangSuen(img, w, h) {
  const idx = (r, c) => r * w + c;
  let changed = true;

  while (changed) {
    changed = false;

    // Sub-iteration 1
    const remove1 = [];
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        if (!img[idx(r, c)]) continue;
        const p2 = img[idx(r - 1, c)];
        const p3 = img[idx(r - 1, c + 1)];
        const p4 = img[idx(r, c + 1)];
        const p5 = img[idx(r + 1, c + 1)];
        const p6 = img[idx(r + 1, c)];
        const p7 = img[idx(r + 1, c - 1)];
        const p8 = img[idx(r, c - 1)];
        const p9 = img[idx(r - 1, c - 1)];
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6)
                + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (A !== 1) continue;
        if (p2 && p4 && p6) continue;
        if (p4 && p6 && p8) continue;
        remove1.push(idx(r, c));
      }
    }
    for (const i of remove1) { img[i] = 0; changed = true; }

    // Sub-iteration 2
    const remove2 = [];
    for (let r = 1; r < h - 1; r++) {
      for (let c = 1; c < w - 1; c++) {
        if (!img[idx(r, c)]) continue;
        const p2 = img[idx(r - 1, c)];
        const p3 = img[idx(r - 1, c + 1)];
        const p4 = img[idx(r, c + 1)];
        const p5 = img[idx(r + 1, c + 1)];
        const p6 = img[idx(r + 1, c)];
        const p7 = img[idx(r + 1, c - 1)];
        const p8 = img[idx(r, c - 1)];
        const p9 = img[idx(r - 1, c - 1)];
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6)
                + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
        if (A !== 1) continue;
        if (p2 && p4 && p8) continue;
        if (p2 && p6 && p8) continue;
        remove2.push(idx(r, c));
      }
    }
    for (const i of remove2) { img[i] = 0; changed = true; }
  }

  return img;
}

/**
 * Extract template points for a letter rendered in the given CSS font-family.
 * Returns a flat array of [x, y] pairs in 0–100 coordinate space.
 *
 * Uses Zhang-Suen thinning to reduce the filled letterform to its 1-pixel
 * skeleton — the medial axis that represents actual pen stroke paths.
 * This produces coverage targets that match handwriting strokes rather than
 * penalizing users for not tracing every edge of a thick printed glyph.
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

  const SIZE = 200;  // render resolution (smaller for thinning perf)
  const STEP = 2;    // sample every STEP px from skeleton

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

  // Render filled letter — full shape for skeletonization
  ctx.fillStyle = '#fff';
  ctx.fillText(letter, SIZE / 2, SIZE / 2);

  // Build binary image from red channel
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const binary = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    binary[i] = data[i * 4] > 128 ? 1 : 0;
  }

  // Thin to skeleton (medial axis)
  thinZhangSuen(binary, SIZE, SIZE);

  // Sample skeleton points
  const points = [];
  for (let row = 0; row < SIZE; row += STEP) {
    for (let col = 0; col < SIZE; col += STEP) {
      if (binary[row * SIZE + col]) {
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
