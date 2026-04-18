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

    // Letter scale: 0.2 = tiny (realistic), 1.0 = full canvas
    this.letterScale = 0.5;

    // Template cache
    this.templatePoints = [];
    this.templateStrokes = [];

    this._setupCanvas();
    this._bindEvents();
    this.setLetter('A');
  }

  setScale(scale) {
    this.letterScale = Math.max(0.15, Math.min(1, scale));
    this.clear();
  }

  // Convert template coord (0-100) → canvas pixel coord
  _t2c(val) {
    const s = this.size;
    const scale = this.letterScale;
    const offset = (1 - scale) / 2;
    return (offset + val / 100 * scale) * s;
  }

  // Convert canvas pixel coord → template coord (0-100)
  _c2t(px) {
    const s = this.size;
    const scale = this.letterScale;
    const offset = (1 - scale) / 2;
    return ((px / s) - offset) / scale * 100;
  }

  _setupCanvas() {
    const resize = () => {
      const container = this.canvas.parentElement;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const size = Math.min(w, h, 600);
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
    // Convert screen coords → template coords (0-100) through scale
    const canvasX = (e.clientX - rect.left) / rect.width * this.size;
    const canvasY = (e.clientY - rect.top) / rect.height * this.size;
    return {
      x: this._c2t(canvasX),
      y: this._c2t(canvasY),
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

    try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}

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
    this.activePenId = null;
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

    // Ruled lines across full canvas
    ctx.strokeStyle = '#252545';
    ctx.lineWidth = 0.5;
    const lineStep = s / 20;
    for (let i = 1; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * lineStep);
      ctx.lineTo(s, i * lineStep);
      ctx.stroke();
    }

    // Letter bounding box (shows where the letter lives)
    const scale = this.letterScale;
    const offset = (1 - scale) / 2 * s;
    const boxSize = scale * s;

    // Box background (slightly lighter)
    ctx.fillStyle = '#1e1e38';
    ctx.fillRect(offset, offset, boxSize, boxSize);

    // Box outline
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 1;
    ctx.strokeRect(offset, offset, boxSize, boxSize);

    // Crosshairs inside box
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(offset + boxSize / 2, offset);
    ctx.lineTo(offset + boxSize / 2, offset + boxSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset, offset + boxSize / 2);
    ctx.lineTo(offset + boxSize, offset + boxSize / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawTemplate(ctx, s) {
    const glowSize = Math.max(8, 22 * this.letterScale);
    const dotSize = Math.max(1.5, 2 * this.letterScale);
    const startDot = Math.max(3, 5 * this.letterScale);
    const lineW = Math.max(1.5, 3 * this.letterScale);

    for (const stroke of this.templateStrokes) {
      if (stroke.length < 2) continue;

      // Glow effect
      ctx.strokeStyle = 'rgba(144, 202, 249, 0.08)';
      ctx.lineWidth = glowSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this._t2c(stroke[0][0]), this._t2c(stroke[0][1]));
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(this._t2c(stroke[i][0]), this._t2c(stroke[i][1]));
      }
      ctx.stroke();

      // Dotted guide path
      ctx.strokeStyle = 'rgba(144, 202, 249, 0.35)';
      ctx.lineWidth = lineW;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(this._t2c(stroke[0][0]), this._t2c(stroke[0][1]));
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(this._t2c(stroke[i][0]), this._t2c(stroke[i][1]));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots at waypoints
      ctx.fillStyle = 'rgba(144, 202, 249, 0.25)';
      for (const [x, y] of stroke) {
        ctx.beginPath();
        ctx.arc(this._t2c(x), this._t2c(y), dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Start dot (brighter)
      ctx.fillStyle = 'rgba(144, 202, 249, 0.6)';
      ctx.beginPath();
      ctx.arc(this._t2c(stroke[0][0]), this._t2c(stroke[0][1]), startDot, 0, Math.PI * 2);
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
    const strokeW = Math.max(1.5, this.letterScale * 3);

    for (let i = 1; i < stroke.length; i++) {
      const p0 = stroke[i - 1];
      const p1 = stroke[i];
      const dist = dists[i];
      const color = distanceColor(dist);

      // Pressure-based width, scaled to letter size
      const width = strokeW + (p1.pressure || 0.5) * strokeW * 1.5;

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isActive ? 0.85 : 1;
      ctx.beginPath();
      ctx.moveTo(this._t2c(p0.x), this._t2c(p0.y));
      ctx.lineTo(this._t2c(p1.x), this._t2c(p1.y));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
