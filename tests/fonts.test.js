// Unit tests for fonts.js — font presets and point extraction
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FONT_PRESETS,
  DEFAULT_FONT,
  CUSTOM_FONT_NAME,
  extractFontPoints,
  clearFontCache,
} from '../js/fonts.js';

// jsdom doesn't implement canvas 2D pixel ops, so we stub getContext('2d')
// to return a minimal mock that tracks calls without throwing.
function makeMockCtx() {
  return {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400 * 400 * 4) })),
  };
}

function stubCanvas() {
  const mockCtx = makeMockCtx();
  const original = document.createElement.bind(document);
  const spy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') {
      const el = { width: 0, height: 0, getContext: vi.fn(() => mockCtx) };
      return el;
    }
    return original(tag);
  });
  return { spy, mockCtx };
}

describe('FONT_PRESETS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FONT_PRESETS)).toBe(true);
    expect(FONT_PRESETS.length).toBeGreaterThan(0);
  });

  it('each preset has label and family', () => {
    for (const preset of FONT_PRESETS) {
      expect(typeof preset.label).toBe('string');
      expect(typeof preset.family).toBe('string');
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.family.length).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_FONT matches the first preset family', () => {
    expect(DEFAULT_FONT).toBe(FONT_PRESETS[0].family);
  });
});

describe('CUSTOM_FONT_NAME', () => {
  it('is a non-empty string', () => {
    expect(typeof CUSTOM_FONT_NAME).toBe('string');
    expect(CUSTOM_FONT_NAME.length).toBeGreaterThan(0);
  });
});

describe('extractFontPoints', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearFontCache();
  });

  it('returns an array without throwing', () => {
    const { spy } = stubCanvas();
    const pts = extractFontPoints('A', 'Georgia, serif');
    expect(Array.isArray(pts)).toBe(true);
    spy.mockRestore();
  });

  it('all returned points are [x, y] pairs in 0–100', () => {
    // Return one lit pixel at position (200, 200) in a 400×400 canvas
    const mockCtx = makeMockCtx();
    const imgData = new Uint8ClampedArray(400 * 400 * 4);
    imgData[(200 * 400 + 200) * 4] = 255; // lit pixel at (200, 200)
    mockCtx.getImageData = vi.fn(() => ({ data: imgData }));

    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return { width: 0, height: 0, getContext: vi.fn(() => mockCtx) };
      return document.createElement.wrappedMethod?.(tag) ?? document.createElementNS(null, tag);
    });

    const pts = extractFontPoints('F', 'Test');
    expect(pts.some(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    createSpy.mockRestore();
  });

  it('returns cached result on second call with same args', () => {
    clearFontCache();
    const { spy } = stubCanvas();
    extractFontPoints('B', 'Georgia, serif');
    const callsAfterFirst = spy.mock.calls.length;

    extractFontPoints('B', 'Georgia, serif'); // should hit cache
    expect(spy.mock.calls.length).toBe(callsAfterFirst);
    spy.mockRestore();
  });

  it('creates a new canvas for a different letter', () => {
    clearFontCache();
    const { spy } = stubCanvas();
    extractFontPoints('C', 'Georgia, serif');
    const after1 = spy.mock.calls.length;

    extractFontPoints('D', 'Georgia, serif'); // different letter → no cache
    expect(spy.mock.calls.length).toBeGreaterThan(after1);
    spy.mockRestore();
  });
});

describe('clearFontCache', () => {
  it('forces re-extraction after clearing', () => {
    clearFontCache();
    const { spy } = stubCanvas();
    extractFontPoints('E', 'Georgia, serif');
    const after1 = spy.mock.calls.length;

    clearFontCache();
    extractFontPoints('E', 'Georgia, serif'); // cache cleared → new extraction
    expect(spy.mock.calls.length).toBeGreaterThan(after1);
    spy.mockRestore();
  });
});
