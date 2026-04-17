// Main app controller — wires canvas, letter picker, score display
import { DrawingCanvas } from './canvas.js';
import { LETTER_ORDER } from './templates.js';

let canvas;
let currentLetterIdx = 0;

function init() {
  const canvasEl = document.getElementById('draw-canvas');
  const scoreEls = {
    accuracy: document.getElementById('score-accuracy'),
    coverage: document.getElementById('score-coverage'),
    smoothness: document.getElementById('score-smoothness'),
    overall: document.getElementById('score-overall'),
    bar: document.getElementById('score-bar-fill')
  };

  canvas = new DrawingCanvas(canvasEl, score => updateScoreDisplay(score, scoreEls));

  buildLetterPicker();
  bindButtons();
  bindKeyboard();
  selectLetter(0);

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) {
      btn.hidden = false;
      btn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { btn.hidden = true; });
      });
    }
  });
}

function buildLetterPicker() {
  const picker = document.getElementById('letter-picker');
  LETTER_ORDER.forEach((letter, idx) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.dataset.idx = idx;
    btn.addEventListener('click', () => selectLetter(idx));
    picker.appendChild(btn);
  });
}

function selectLetter(idx) {
  currentLetterIdx = idx;
  const letter = LETTER_ORDER[idx];
  canvas.setLetter(letter);

  // Update active state
  document.querySelectorAll('.letter-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  // Update current letter display
  const display = document.getElementById('current-letter');
  if (display) display.textContent = letter;

  // Scroll active button into view
  const activeBtn = document.querySelector('.letter-btn.active');
  if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function bindButtons() {
  document.getElementById('btn-clear').addEventListener('click', () => canvas.clear());
  document.getElementById('btn-undo').addEventListener('click', () => canvas.undo());
  document.getElementById('btn-prev').addEventListener('click', () => {
    selectLetter((currentLetterIdx - 1 + 26) % 26);
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    selectLetter((currentLetterIdx + 1) % 26);
  });
}

function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') selectLetter((currentLetterIdx - 1 + 26) % 26);
    else if (e.key === 'ArrowRight') selectLetter((currentLetterIdx + 1) % 26);
    else if (e.key === 'Escape' || e.key === 'Delete') canvas.clear();
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) canvas.undo();
    else {
      const upper = e.key.toUpperCase();
      const idx = LETTER_ORDER.indexOf(upper);
      if (idx !== -1) selectLetter(idx);
    }
  });
}

function updateScoreDisplay(score, els) {
  const fmt = v => Math.round(v * 100);
  els.accuracy.textContent = fmt(score.accuracy) + '%';
  els.coverage.textContent = fmt(score.coverage) + '%';
  els.smoothness.textContent = fmt(score.smoothness) + '%';
  els.overall.textContent = fmt(score.overall) + '%';

  // Animate bar
  const pct = fmt(score.overall);
  els.bar.style.width = pct + '%';

  // Color the bar based on score
  if (pct >= 80) els.bar.style.background = '#66bb6a';
  else if (pct >= 50) els.bar.style.background = '#ffa726';
  else els.bar.style.background = '#ef5350';

  // Color individual scores
  colorScore(els.accuracy, score.accuracy);
  colorScore(els.coverage, score.coverage);
  colorScore(els.smoothness, score.smoothness);
  colorScore(els.overall, score.overall);
}

function colorScore(el, value) {
  if (value >= 0.8) el.className = 'score-value good';
  else if (value >= 0.5) el.className = 'score-value ok';
  else el.className = 'score-value low';
}

document.addEventListener('DOMContentLoaded', init);
