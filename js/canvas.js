// Canvas drawing engine — Pointer Events, DPI-aware, pressure-sensitive
import { getTemplatePoints, getTemplateStrokes } from './templates.js';
import { pointDistances, distanceColor, compositeScore } from './scoring.js';

export class DrawingCanvas {
  constructor(canvasEl, onScoreUpdate) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onScoreUpdate = onScoreUpdate;

    // State
    this.currentLetter = 'A';
    this.userStrokes = [];     // [[{x,y,pressure},...], ...]
    this.activeStroke = null;
    this.isDrawing = false;
    this.activePenId = null;   // for palm rejection

    // Template cache
    this.templatePoints = [];
    this.templateStrokes = [];

    this._setupCanvas();
    this._bindEvents();
    this.setLetter('A');
  }

  _setupCanvas() {
    const resize = () => {
      const container = this.canvas.parentElement;
      const size = Math.min(container.clientWidth - 32, 500);
      const dpr = window.devicePixelRatio || 1;
      this.canvas.style.width = size + 'px';
      this.canvas.style.height = size + 'px';
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.size = size;
      this.render();
    };
    window.addEventListener('resize', resize);
    resize();
  }

  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => this._onDown(e));
    c.addEventListener('pointermove', e => this._onMove(e));
    c.addEventListener('pointerup', e => this._onUp(e));
    c.addEventListener('pointercancel', e => this._onUp(e));
    c.addEventListener('pointerleave', e => this._onUp(e));

    // Prevent scrolling while drawing on touch devices
    c.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    c.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      pressure: e.pressure || 0.5,
      pointerType: e.pointerType
    };
  }

  _onDown(e) {
    // Palm rejection: if a pen is active, ignore touch
    if (this.activePenId !== null && e.pointerType === 'touch') return;
    if (e.pointerType === 'pen') this.activePenId = e.pointerId;

    this.canvas.setPointerCapture(e.pointerId);
    this.isDrawing = true;
    const pos = this._getPos(e);
    this.activeStroke = [pos];
    this.render();
  }

  _onMove(e) {
    if (!this.isDrawing || !this.activeStroke) return;
    if (this.activePenId !== null && e.pointerType === 'touch') return;

    const pos = this._getPos(e);
    this.activeStroke.push(pos);
    this.render();
  }

  _onUp(e) {
    if (!this.isDrawing) return;
    if (this.activePenId !== null && e.pointerType === 'touch') return;

    if (e.pointerType === 'pen') this.activePenId = null;
    this.isDrawing = false;

    if (this.activeStroke && this.activeStroke.length > 1) {
      this.userStrokes.push(this.activeStroke);
    }
    this.activeStroke = null;
    this._updateScore();
    this.render();
  }

  setLetter(letter) {
    this.currentLetter = letter;
    this.templatePoints = getTemplatePoints(letter);
    this.templateStrokes = getTemplateStrokes(letter);
    this.clear();
  }

  clear() {
    this.userStrokes = [];
    this.activeStroke = null;
    this.isDrawing = false;
    this.onScoreUpdate({ accuracy: 0, coverage: 0, smoothness: 0, overall: 0 });
    this.render();
  }

  undo() {
    this.userStrokes.pop();
    this._updateScore();
    this.render();
  }

  _updateScore() {
    const allUserPts = this._getAllUserPoints();
    if (allUserPts.length === 0) {
      this.onScoreUpdate({ accuracy: 0, coverage: 0, smoothness: 0, overall: 0 });
      return;
    }
    const score = compositeScore(allUserPts, this.templatePoints);
    this.onScoreUpdate(score);
  }

  _getAllUserPoints() {
    const pts = [];
    for (const stroke of this.userStrokes) {
      for (const p of stroke) pts.push([p.x, p.y]);
    }
    if (this.activeStroke) {
      for (const p of this.activeStroke) pts.push([p.x, p.y]);
    }
    return pts;
  }

  // --- Rendering ---

  render() {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);

    this._drawPaper(ctx, s);
    this._drawTemplate(ctx, s);
    this._drawUserStrokes(ctx, s);
    if (this.activeStroke) {
      this._drawStroke(ctx, s, this.activeStroke, true);
    }
  }

  _drawPaper(ctx, s) {
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, s, s);

    // Grid lines
    ctx.strokeStyle = '#252545';
    ctx.lineWidth = 1;
    const step = s / 10;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(s, i * step);
      ctx.stroke();
    }

    // Center crosshair (subtle)
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s / 2, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s / 2);
    ctx.lineTo(s, s / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawTemplate(ctx, s) {
    for (const stroke of this.templateStrokes) {
      if (stroke.length < 2) continue;

      // Glow effect
      ctx.strokeStyle = 'rgba(144, 202, 249, 0.08)';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke[0][0] * s / 100, stroke[0][1] * s / 100);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0] * s / 100, stroke[i][1] * s / 100);
      }
      ctx.stroke();

      // Dotted guide path
      ctx.strokeStyle = 'rgba(144, 202, 249, 0.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(stroke[0][0] * s / 100, stroke[0][1] * s / 100);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0] * s / 100, stroke[i][1] * s / 100);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots at waypoints (show where the template points are)
      ctx.fillStyle = 'rgba(144, 202, 249, 0.25)';
      for (const [x, y] of stroke) {
        ctx.beginPath();
        ctx.arc(x * s / 100, y * s / 100, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Start dot (brighter)
      ctx.fillStyle = 'rgba(144, 202, 249, 0.6)';
      ctx.beginPath();
      ctx.arc(stroke[0][0] * s / 100, stroke[0][1] * s / 100, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawUserStrokes(ctx, s) {
    for (const stroke of this.userStrokes) {
      this._drawStroke(ctx, s, stroke, false);
    }
  }

  _drawStroke(ctx, s, stroke, isActive) {
    if (stroke.length < 2) return;

    const pts = stroke.map(p => [p.x, p.y]);
    const dists = pointDistances(pts, this.templatePoints);

    for (let i = 1; i < stroke.length; i++) {
      const p0 = stroke[i - 1];
      const p1 = stroke[i];
      const dist = dists[i];
      const color = distanceColor(dist);

      // Pressure-based width: 2–6px
      const width = 2 + (p1.pressure || 0.5) * 4;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isActive ? 0.85 : 1;
      ctx.beginPath();
      ctx.moveTo(p0.x * s / 100, p0.y * s / 100);
      ctx.lineTo(p1.x * s / 100, p1.y * s / 100);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
