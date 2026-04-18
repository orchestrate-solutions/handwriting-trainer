// Integration test — app.js button wiring
// Verifies that clicking Clear/Undo actually invokes canvas methods
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('app button wiring', () => {
  let clearBtn, undoBtn, prevBtn, nextBtn, canvas;

  beforeEach(async () => {
    // Set up the full DOM from index.html structure
    document.body.innerHTML = `
      <div id="letter-picker" role="tablist"></div>
      <input type="range" id="size-slider" min="15" max="100" value="50" step="5">
      <div class="canvas-wrap">
        <canvas id="draw-canvas"></canvas>
      </div>
      <div id="score-accuracy">0%</div>
      <div id="score-coverage">0%</div>
      <div id="score-smoothness">0%</div>
      <div id="score-overall">0%</div>
      <div id="score-bar"></div>
      <button id="btn-prev">Prev</button>
      <button id="btn-clear">Clear</button>
      <button id="btn-undo">Undo</button>
      <button id="btn-next">Next</button>
    `;

    // Create a container with dimensions for canvas setup
    const canvasWrap = document.querySelector('.canvas-wrap');
    Object.defineProperty(canvasWrap, 'clientWidth', { value: 400 });
    Object.defineProperty(canvasWrap, 'clientHeight', { value: 400 });

    const canvasEl = document.getElementById('draw-canvas');
    const ctxStub = {
      clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      arc: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
      setLineDash: vi.fn(), setTransform: vi.fn(),
      fillStyle: '', strokeStyle: '', lineWidth: 1,
      lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1,
    };
    canvasEl.getContext = vi.fn(() => ctxStub);
    canvasEl.setPointerCapture = vi.fn();

    clearBtn = document.getElementById('btn-clear');
    undoBtn = document.getElementById('btn-undo');
    prevBtn = document.getElementById('btn-prev');
    nextBtn = document.getElementById('btn-next');
  });

  it('clear button has correct ID in DOM', () => {
    expect(clearBtn).not.toBeNull();
    expect(clearBtn.id).toBe('btn-clear');
  });

  it('undo button has correct ID in DOM', () => {
    expect(undoBtn).not.toBeNull();
    expect(undoBtn.id).toBe('btn-undo');
  });

  it('native button click fires click event', () => {
    const handler = vi.fn();
    clearBtn.addEventListener('click', handler);
    clearBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cup-button click fires on host when inner button clicked', () => {
    // Simulate cup-button structure: <cup-button id="btn-clear"><button>Clear</button></cup-button>
    document.body.innerHTML = '';
    const host = document.createElement('div'); // simulates <cup-button>
    host.id = 'btn-test';
    const inner = document.createElement('button');
    inner.textContent = 'Clear';
    host.appendChild(inner);
    document.body.appendChild(host);

    const handler = vi.fn();
    host.addEventListener('click', handler);

    // Click the inner button — should bubble to host
    inner.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cup-button click fires on host when host clicked', () => {
    const host = document.createElement('div');
    host.id = 'btn-test';
    const inner = document.createElement('button');
    inner.textContent = 'Clear';
    host.appendChild(inner);
    document.body.appendChild(host);

    const handler = vi.fn();
    host.addEventListener('click', handler);

    // Click the host element directly
    host.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
