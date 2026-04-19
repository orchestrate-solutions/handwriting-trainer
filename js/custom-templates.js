// js/custom-templates.js — User-created handwriting templates
//
// Users can draw their own ideal letterforms (or import SVGs) and save them
// as templates. These templates are scored via the same skeleton-based system
// as font templates, but the template points come from the user's own strokes
// or from an imported SVG's rendered skeleton.
//
// Storage: localStorage under 'hw-custom-templates'.
// Each template: { id, label, points, preview, source, timestamp }

import { thinZhangSuen } from './fonts.js';

const STORAGE_KEY = 'hw-custom-templates';

/**
 * @typedef {Object} CustomTemplate
 * @property {string} id          — Unique ID
 * @property {string} label       — The letter, word, or symbol this template represents
 * @property {number[][]} points  — Skeleton points in 0–100 space [[x,y], ...]
 * @property {string} preview     — JPEG data URL thumbnail of the template
 * @property {'drawn'|'svg'} source — How the template was created
 * @property {number} timestamp   — Unix ms when created
 */

/** @returns {CustomTemplate[]} All saved templates, newest first. */
export function getCustomTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

/** Get a single template by label (case-sensitive). */
export function getTemplateByLabel(label) {
  return getCustomTemplates().find(t => t.label === label) || null;
}

/** Get all unique labels that have saved templates. */
export function getCustomLabels() {
  return getCustomTemplates().map(t => t.label);
}

/**
 * Save a template. If one with the same label exists, it's replaced.
 * @param {CustomTemplate} template
 */
export function saveCustomTemplate(template) {
  const templates = getCustomTemplates().filter(t => t.label !== template.label);
  templates.unshift(template);
  _persist(templates);
}

/** Delete a template by label. */
export function deleteCustomTemplate(label) {
  const templates = getCustomTemplates().filter(t => t.label !== label);
  _persist(templates);
}

/** Delete all custom templates. */
export function clearCustomTemplates() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Extract skeleton points from user-drawn strokes.
 * Strokes are arrays of {x, y} in 0-100 template space.
 * Renders them onto an offscreen canvas, thins to skeleton, samples points.
 *
 * @param {Array<Array<{x:number, y:number}>>} strokes
 * @returns {number[][]} Points in 0-100 space
 */
export function skeletonFromStrokes(strokes) {
  const SIZE = 200;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Draw strokes in white
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(3, SIZE * 0.025);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x / 100 * SIZE, stroke[0].y / 100 * SIZE);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x / 100 * SIZE, stroke[i].y / 100 * SIZE);
    }
    ctx.stroke();
  }

  return _extractSkeleton(ctx, SIZE);
}

/**
 * Extract skeleton points from an SVG file.
 * Renders the SVG onto an offscreen canvas at a fixed size, then thins.
 *
 * @param {string} svgText — Raw SVG markup
 * @returns {Promise<number[][]>} Points in 0-100 space
 */
export async function skeletonFromSVG(svgText) {
  const SIZE = 200;

  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await _loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw SVG scaled to fit with margin
    const margin = SIZE * 0.05;
    const drawSize = SIZE - margin * 2;
    const scale = Math.min(drawSize / img.width, drawSize / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (SIZE - w) / 2;
    const y = (SIZE - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    return _extractSkeleton(ctx, SIZE);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate a preview thumbnail from strokes.
 * @param {Array<Array<{x:number, y:number}>>} strokes
 * @returns {string} JPEG data URL
 */
export function previewFromStrokes(strokes) {
  const SIZE = 120;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = '#90caf9';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x / 100 * SIZE, stroke[0].y / 100 * SIZE);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x / 100 * SIZE, stroke[i].y / 100 * SIZE);
    }
    ctx.stroke();
  }

  return canvas.toDataURL('image/jpeg', 0.7);
}

// --- Internal helpers ---

function _extractSkeleton(ctx, SIZE) {
  const STEP = 2;
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const binary = new Uint8Array(SIZE * SIZE);

  for (let i = 0; i < SIZE * SIZE; i++) {
    // Use brightness: any channel > 128
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    binary[i] = (r > 128 || g > 128 || b > 128) ? 1 : 0;
  }

  thinZhangSuen(binary, SIZE, SIZE);

  const points = [];
  for (let row = 0; row < SIZE; row += STEP) {
    for (let col = 0; col < SIZE; col += STEP) {
      if (binary[row * SIZE + col]) {
        points.push([col / SIZE * 100, row / SIZE * 100]);
      }
    }
  }

  return points;
}

function _loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function _persist(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (_) {
    // Quota exceeded — trim oldest half
    templates.splice(Math.floor(templates.length / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (_) { /* give up */ }
  }
}
