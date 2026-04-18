// Main app controller — wires canvas, letter picker, score display
// Uses cup-ui components: <cup-slider>, <cup-button>
import { DrawingCanvas } from './canvas.js';
import { LETTER_ORDER } from './templates.js';
import { FONT_PRESETS, loadCustomFont } from './fonts.js';

let canvas;
let currentLetterIdx = 0;

function init() {
  const canvasEl = document.getElementById('draw-canvas');
  const scoreEls = {
    accuracy: document.getElementById('score-accuracy'),
    coverage: document.getElementById('score-coverage'),
    smoothness: document.getElementById('score-smoothness'),
    overall: document.getElementById('score-overall'),
    bar: document.getElementById('score-bar')
  };

  canvas = new DrawingCanvas(canvasEl, score => updateScoreDisplay(score, scoreEls));

  buildLetterPicker();
  buildFontPicker();
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

function buildFontPicker() {
  const select = document.getElementById('font-select');
  if (!select) return;

  // Populate preset options
  FONT_PRESETS.forEach(({ label, family }) => {
    const opt = document.createElement('option');
    opt.value = family;
    opt.textContent = label;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    canvas.setFont(select.value);
  });

  // Custom font file upload
  const fileInput = document.getElementById('font-file');
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const family = await loadCustomFont(file);
        // Add or update the custom option
        let customOpt = select.querySelector('option[data-custom]');
        if (!customOpt) {
          customOpt = document.createElement('option');
          customOpt.dataset.custom = '1';
          select.appendChild(customOpt);
        }
        customOpt.value = family;
        customOpt.textContent = `✨ ${file.name.replace(/\.[^.]+$/, '')}`;
        select.value = family;
        canvas.setFont(family);
      } catch (err) {
        console.error('Font load failed:', err);
      }
      fileInput.value = '';
    });
  }
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

  document.querySelectorAll('.letter-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

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

  // cup-slider emits 'input' from its internal <input>
  const slider = document.getElementById('size-slider');
  slider.addEventListener('input', e => {
    const input = slider.querySelector('input') || e.target;
    const pct = parseInt(input.value, 10);
    canvas.setScale(pct / 100);
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

  // Update cup-progress bar
  const pct = fmt(score.overall);
  if (els.bar) {
    els.bar.setAttribute('value', pct);
    // Set variant based on score level
    if (pct >= 80) els.bar.setAttribute('variant', 'success');
    else if (pct >= 50) els.bar.setAttribute('variant', 'warning');
    else els.bar.setAttribute('variant', 'error');
  }

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
