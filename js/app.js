// Main app controller — wires canvas, drill picker, score display
// Uses cup-ui components: <cup-slider>, <cup-button>
import { DrawingCanvas } from './canvas.js';
import { DRILLS, DEFAULT_DRILL } from './drills.js';
import { FONT_PRESETS, loadCustomFont } from './fonts.js';

let canvas;
let currentDrill = DEFAULT_DRILL;
let currentItemIdx = 0;

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

  buildDrillNav();
  buildItemPicker(currentDrill.items);
  buildFontPicker();
  bindButtons();
  bindKeyboard();
  selectItem(0);

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

function buildDrillNav() {
  const nav = document.getElementById('drill-nav');
  if (!nav) return;
  DRILLS.forEach(drill => {
    const btn = document.createElement('button');
    btn.className = 'drill-btn';
    btn.textContent = drill.label;
    btn.dataset.id = drill.id;
    btn.classList.toggle('active', drill.id === currentDrill.id);
    btn.addEventListener('click', () => selectDrill(drill));
    nav.appendChild(btn);
  });
}

function selectDrill(drill) {
  currentDrill = drill;
  currentItemIdx = 0;
  document.querySelectorAll('.drill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === drill.id);
  });
  buildItemPicker(drill.items);
  selectItem(0);
}

function buildItemPicker(items) {
  const picker = document.getElementById('letter-picker');
  picker.innerHTML = '';
  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = item;
    btn.dataset.idx = idx;
    btn.addEventListener('click', () => selectItem(idx));
    picker.appendChild(btn);
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
  buildItemPicker(currentDrill.items);
}

function selectItem(idx) {
  currentItemIdx = idx;
  const item = currentDrill.items[idx];
  canvas.setLetter(item);

  document.querySelectorAll('.letter-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  const activeBtn = document.querySelector('.letter-btn.active');
  if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

// Keep alias for any external callers / tests
function selectLetter(idx) { selectItem(idx); }

function bindButtons() {
  document.getElementById('btn-clear').addEventListener('click', () => canvas.clear());
  document.getElementById('btn-undo').addEventListener('click', () => canvas.undo());
  document.getElementById('btn-prev').addEventListener('click', () => {
    selectItem((currentItemIdx - 1 + currentDrill.items.length) % currentDrill.items.length);
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    selectItem((currentItemIdx + 1) % currentDrill.items.length);
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
    const len = currentDrill.items.length;
    if (e.key === 'ArrowLeft') selectItem((currentItemIdx - 1 + len) % len);
    else if (e.key === 'ArrowRight') selectItem((currentItemIdx + 1) % len);
    else if (e.key === 'Escape' || e.key === 'Delete') canvas.clear();
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) canvas.undo();
    // Letter-key shortcut only applies to single-character drills
    else if (currentDrill.items[0]?.length === 1) {
      const key = e.key.length === 1 ? e.key : null;
      if (key) {
        const idx = currentDrill.items.indexOf(key);
        if (idx !== -1) selectItem(idx);
      }
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
