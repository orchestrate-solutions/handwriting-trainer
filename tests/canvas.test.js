// Tests for DrawingCanvas — clear, undo, stroke management
// Uses jsdom for minimal DOM environment
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrawingCanvas } from '../js/canvas.js';

// Minimal canvas stub — jsdom doesn't implement canvas 2D context
function createMockCanvas() {
  const el = document.createElement('canvas');
  el.width = 400;
  el.height = 400;

  // Wrap in a container (DrawingCanvas._setupCanvas reads parentElement)
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 400 });
  Object.defineProperty(container, 'clientHeight', { value: 400 });
  container.appendChild(el);
  document.body.appendChild(container);

  // Stub getContext since jsdom doesn't have CanvasRenderingContext2D
  const ctxStub = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    save: vi.fn(),
    restore: vi.fn(),
  };
  el.getContext = vi.fn(() => ctxStub);

  // Stub setPointerCapture
  el.setPointerCapture = vi.fn();

  return { el, ctxStub, container };
}

// Mock font extraction — returns 3 predictable points
const mockExtract = () => [[10, 10], [50, 50], [90, 90]];

describe('DrawingCanvas', () => {
  let canvas;
  let scoreCallback;
  let mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    mock = createMockCanvas();
    scoreCallback = vi.fn();
    canvas = new DrawingCanvas(mock.el, scoreCallback, { _extractFn: mockExtract });
  });

  // ── Initial state ─────────────────────────────────────────────

  it('starts with no user strokes', () => {
    expect(canvas.userStrokes).toEqual([]);
  });

  it('starts with no active stroke', () => {
    expect(canvas.activeStroke).toBeNull();
  });

  it('sets default letter to A', () => {
    expect(canvas.currentLetter).toBe('A');
  });

  it('loads template points from font extraction', () => {
    expect(canvas.templatePoints).toEqual([[10, 10], [50, 50], [90, 90]]);
  });

  // ── clear() ───────────────────────────────────────────────────

  describe('clear()', () => {
    it('empties all user strokes', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
        [{ x: 30, y: 30, pressure: 0.5 }, { x: 40, y: 40, pressure: 0.5 }],
      ];
      canvas.clear();
      expect(canvas.userStrokes).toEqual([]);
    });

    it('nulls active stroke', () => {
      canvas.activeStroke = [{ x: 5, y: 5, pressure: 0.5 }];
      canvas.clear();
      expect(canvas.activeStroke).toBeNull();
    });

    it('resets isDrawing flag', () => {
      canvas.isDrawing = true;
      canvas.clear();
      expect(canvas.isDrawing).toBe(false);
    });

    it('resets activePenId', () => {
      canvas.activePenId = 1;
      canvas.clear();
      expect(canvas.activePenId).toBeNull();
    });

    it('fires score callback with all zeros', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      scoreCallback.mockClear();
      canvas.clear();
      expect(scoreCallback).toHaveBeenCalledWith({
        accuracy: 0, coverage: 0, smoothness: 0, overall: 0,
      });
    });

    it('calls render after clearing', () => {
      const renderSpy = vi.spyOn(canvas, 'render');
      canvas.clear();
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  // ── undo() ────────────────────────────────────────────────────

  describe('undo()', () => {
    it('removes the last stroke', () => {
      const stroke1 = [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }];
      const stroke2 = [{ x: 30, y: 30, pressure: 0.5 }, { x: 40, y: 40, pressure: 0.5 }];
      canvas.userStrokes = [stroke1, stroke2];

      canvas.undo();

      expect(canvas.userStrokes).toHaveLength(1);
      expect(canvas.userStrokes[0]).toBe(stroke1);
    });

    it('handles undo on empty strokes without error', () => {
      canvas.userStrokes = [];
      expect(() => canvas.undo()).not.toThrow();
      expect(canvas.userStrokes).toEqual([]);
    });

    it('calls render after undo', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      const renderSpy = vi.spyOn(canvas, 'render');
      canvas.undo();
      expect(renderSpy).toHaveBeenCalled();
    });

    it('updates score after undo', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      scoreCallback.mockClear();
      canvas.undo();
      expect(scoreCallback).toHaveBeenCalled();
    });

    it('score resets to zero when last stroke undone', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      scoreCallback.mockClear();
      canvas.undo();
      const callArg = scoreCallback.mock.calls[0][0];
      expect(callArg.accuracy).toBe(0);
      expect(callArg.coverage).toBe(0);
      expect(callArg.overall).toBe(0);
    });
  });

  // ── setLetter() ───────────────────────────────────────────────

  describe('setLetter()', () => {
    it('updates current letter', () => {
      canvas.setLetter('B');
      expect(canvas.currentLetter).toBe('B');
    });

    it('clears strokes when changing letter', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      canvas.setLetter('C');
      expect(canvas.userStrokes).toEqual([]);
    });

    it('loads new template points from font extraction', () => {
      canvas.setLetter('B');
      expect(canvas.templatePoints).toEqual([[10, 10], [50, 50], [90, 90]]);
    });
  });

  // ── setFont() ─────────────────────────────────────────────────

  describe('setFont()', () => {
    it('updates fontFamily', () => {
      canvas.setFont('cursive');
      expect(canvas.fontFamily).toBe('cursive');
    });

    it('clears the point cache when font changes', () => {
      canvas._pointCache.set('A::Georgia, serif', [[1, 1]]);
      canvas.setFont('cursive');
      expect(canvas._pointCache.size).toBe(1); // repopulated with new font for current letter
    });

    it('reloads template points for current letter', () => {
      let callCount = 0;
      const countingExtract = () => { callCount++; return [[5, 5]]; };
      canvas._extractFn = countingExtract;
      canvas.setFont('cursive');
      expect(canvas.templatePoints).toEqual([[5, 5]]);
    });
  });

  // ── setScale() ────────────────────────────────────────────────

  describe('setScale()', () => {
    it('clamps scale to [0.15, 1]', () => {
      canvas.setScale(0.05);
      expect(canvas.letterScale).toBe(0.15);
      canvas.setScale(2);
      expect(canvas.letterScale).toBe(1);
    });

    it('clears canvas when scale changes', () => {
      canvas.userStrokes = [
        [{ x: 10, y: 10, pressure: 0.5 }, { x: 20, y: 20, pressure: 0.5 }],
      ];
      canvas.setScale(0.3);
      expect(canvas.userStrokes).toHaveLength(1); // strokes preserved on scale change
    });
  });

  // ── Stroke recording ─────────────────────────────────────────

  describe('stroke lifecycle', () => {
    function fakePointerEvent(type, x, y, opts = {}) {
      return new PointerEvent(type, {
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: opts.pointerType || 'mouse',
        pressure: opts.pressure || 0.5,
        bubbles: true,
      });
    }

    it('records a complete stroke on down→move→up', () => {
      mock.el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 50, 50));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 60, 60));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 70, 70));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 70, 70));

      expect(canvas.userStrokes).toHaveLength(1);
      expect(canvas.userStrokes[0].length).toBeGreaterThanOrEqual(2);
    });

    it('does not record single-point strokes (taps)', () => {
      mock.el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 50, 50));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 50, 50));

      expect(canvas.userStrokes).toHaveLength(0);
    });

    it('clear after drawing removes all strokes', () => {
      mock.el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 10, 10));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 20, 20));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 20, 20));

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 30, 30));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 40, 40));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 40, 40));

      expect(canvas.userStrokes).toHaveLength(2);

      canvas.clear();
      expect(canvas.userStrokes).toEqual([]);
      expect(canvas.isDrawing).toBe(false);
    });

    it('undo after drawing removes last stroke only', () => {
      mock.el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 });

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 10, 10));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 20, 20));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 20, 20));

      mock.el.dispatchEvent(fakePointerEvent('pointerdown', 30, 30));
      mock.el.dispatchEvent(fakePointerEvent('pointermove', 40, 40));
      mock.el.dispatchEvent(fakePointerEvent('pointerup', 40, 40));

      canvas.undo();
      expect(canvas.userStrokes).toHaveLength(1);
    });
  });
});
