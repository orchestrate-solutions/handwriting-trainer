// Unit tests for custom-templates.js — user-created handwriting templates
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCustomTemplates,
  getTemplateByLabel,
  getCustomLabels,
  saveCustomTemplate,
  deleteCustomTemplate,
  clearCustomTemplates,
  skeletonFromStrokes,
  previewFromStrokes,
} from '../js/custom-templates.js';

const STORAGE_KEY = 'hw-custom-templates';

function makeTemplate(label, overrides = {}) {
  return {
    id: `test-${Date.now()}`,
    label,
    points: [[50, 50], [60, 60]],
    preview: 'data:image/jpeg;base64,abc',
    source: 'drawn',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('custom template storage', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('getCustomTemplates returns empty array when no data', () => {
    expect(getCustomTemplates()).toEqual([]);
  });

  it('saveCustomTemplate stores and retrieves a template', () => {
    const tmpl = makeTemplate('A');
    saveCustomTemplate(tmpl);
    const stored = getCustomTemplates();
    expect(stored.length).toBe(1);
    expect(stored[0].label).toBe('A');
  });

  it('saveCustomTemplate replaces existing template with same label', () => {
    saveCustomTemplate(makeTemplate('A', { points: [[1, 1]] }));
    saveCustomTemplate(makeTemplate('A', { points: [[2, 2]] }));
    const stored = getCustomTemplates();
    expect(stored.length).toBe(1);
    expect(stored[0].points).toEqual([[2, 2]]);
  });

  it('saves multiple templates with different labels', () => {
    saveCustomTemplate(makeTemplate('A'));
    saveCustomTemplate(makeTemplate('B'));
    saveCustomTemplate(makeTemplate('hello'));
    expect(getCustomTemplates().length).toBe(3);
  });

  it('getTemplateByLabel returns matching template', () => {
    saveCustomTemplate(makeTemplate('Z'));
    const result = getTemplateByLabel('Z');
    expect(result).not.toBeNull();
    expect(result.label).toBe('Z');
  });

  it('getTemplateByLabel returns null for missing label', () => {
    expect(getTemplateByLabel('missing')).toBeNull();
  });

  it('getCustomLabels returns all labels', () => {
    saveCustomTemplate(makeTemplate('X'));
    saveCustomTemplate(makeTemplate('Y'));
    expect(getCustomLabels()).toEqual(['Y', 'X']);
  });

  it('deleteCustomTemplate removes by label', () => {
    saveCustomTemplate(makeTemplate('A'));
    saveCustomTemplate(makeTemplate('B'));
    deleteCustomTemplate('A');
    const stored = getCustomTemplates();
    expect(stored.length).toBe(1);
    expect(stored[0].label).toBe('B');
  });

  it('clearCustomTemplates removes all', () => {
    saveCustomTemplate(makeTemplate('A'));
    saveCustomTemplate(makeTemplate('B'));
    clearCustomTemplates();
    expect(getCustomTemplates()).toEqual([]);
  });
});

describe('CUSTOM_DRILL', () => {
  it('has expected shape', async () => {
    const { CUSTOM_DRILL } = await import('../js/drills.js');
    expect(CUSTOM_DRILL.id).toBe('custom');
    expect(CUSTOM_DRILL.isCustom).toBe(true);
    expect(Array.isArray(CUSTOM_DRILL.items)).toBe(true);
  });
});

describe('skeletonFromStrokes', () => {
  // These need a canvas mock since they render to offscreen canvas
  let createSpy;
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(200 * 200 * 4),
      })),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,mock'),
    };
    const original = document.createElement.bind(document);
    createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: vi.fn(() => mockCtx) };
      }
      return original(tag);
    });
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('returns an array of points', () => {
    const strokes = [
      [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 90, y: 90 }],
    ];
    const result = skeletonFromStrokes(strokes);
    expect(Array.isArray(result)).toBe(true);
  });

  it('calls canvas rendering methods', () => {
    const strokes = [
      [{ x: 10, y: 10 }, { x: 50, y: 50 }],
    ];
    skeletonFromStrokes(strokes);
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('handles empty strokes', () => {
    const result = skeletonFromStrokes([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('previewFromStrokes', () => {
  let createSpy;
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    const original = document.createElement.bind(document);
    createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => mockCtx),
          toDataURL: vi.fn(() => 'data:image/jpeg;base64,preview'),
        };
      }
      return original(tag);
    });
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('returns a data URL string', () => {
    const strokes = [[{ x: 20, y: 20 }, { x: 80, y: 80 }]];
    const result = previewFromStrokes(strokes);
    expect(typeof result).toBe('string');
    expect(result.startsWith('data:')).toBe(true);
  });
});
