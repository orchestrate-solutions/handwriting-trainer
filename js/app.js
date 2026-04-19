// Main app controller — wires canvas, drill picker, score display
// Uses cup-ui components: <cup-slider>, <cup-button>
import { DrawingCanvas } from './canvas.js';
import { DRILLS, DEFAULT_DRILL } from './drills.js';
import { getAvailableFonts, loadCustomFont } from './fonts.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from './difficulty.js';
import { saveEntry, getHistory, clearHistory } from './history.js';

let canvas;
let currentDrill = DEFAULT_DRILL;
let currentItemIdx = 0;
let currentDifficulty = DEFAULT_DIFFICULTY;
let lastScore = null; // most recent score from onScoreUpdate

function init() {
  const canvasEl = document.getElementById('draw-canvas');
  const scoreEls = {
    accuracy: document.getElementById('score-accuracy'),
    coverage: document.getElementById('score-coverage'),
    smoothness: document.getElementById('score-smoothness'),
    overall: document.getElementById('score-overall'),
    bar: document.getElementById('score-bar')
  };

  canvas = new DrawingCanvas(canvasEl, score => {
    lastScore = score;
    updateScoreDisplay(score, scoreEls);
  });

  buildDrillNav();
  buildItemPicker(currentDrill.items);
  buildDifficultyPicker();
  buildFontPicker();
  bindButtons();
  bindKeyboard();
  selectItem(0, { save: false });

  // Auto-save when user leaves the page
  window.addEventListener('beforeunload', () => saveCurrentToHistory());

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
  saveCurrentToHistory();
  currentDrill = drill;
  currentItemIdx = 0;
  document.querySelectorAll('.drill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === drill.id);
  });
  buildItemPicker(drill.items);
  selectItem(0, { save: false });
}

function buildDifficultyPicker() {
  const nav = document.getElementById('difficulty-nav');
  if (!nav) return;
  DIFFICULTIES.forEach(diff => {
    const btn = document.createElement('button');
    btn.className = 'difficulty-btn';
    btn.textContent = diff.label;
    btn.dataset.id = diff.id;
    btn.classList.toggle('active', diff.id === currentDifficulty.id);
    btn.addEventListener('click', () => selectDifficulty(diff));
    nav.appendChild(btn);
  });
}

function selectDifficulty(diff) {
  currentDifficulty = diff;
  canvas.setDifficulty(diff);
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === diff.id);
  });
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

  // Populate preset options — only fonts available on this device
  const availableFonts = getAvailableFonts();
  availableFonts.forEach(({ label, family }) => {
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

function selectItem(idx, { save = true } = {}) {
  if (save) saveCurrentToHistory();
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

/**
 * Capture the current canvas state and append it to localStorage history.
 * Skips if there are no user strokes or the score is zero.
 */
function saveCurrentToHistory() {
  if (!canvas || canvas.userStrokes.length === 0) return;
  if (!lastScore || lastScore.overall <= 0) return;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    drill: currentDrill.id,
    drillLabel: currentDrill.label,
    item: currentDrill.items[currentItemIdx],
    font: canvas.fontFamily,
    difficulty: currentDifficulty.id,
    difficultyLabel: currentDifficulty.label,
    score: { ...lastScore },
    timestamp: Date.now(),
    imageDataUrl: canvas.toDataURL(),
  };
  saveEntry(entry);
}

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

  // Skeleton path toggle
  const skelBtn = document.getElementById('skeleton-toggle');
  if (skelBtn) {
    skelBtn.addEventListener('click', () => {
      canvas.showSkeleton = !canvas.showSkeleton;
      skelBtn.setAttribute('aria-pressed', String(canvas.showSkeleton));
      skelBtn.classList.toggle('active', canvas.showSkeleton);
      canvas.render();
    });
  }

  // History panel
  const historyBtn = document.getElementById('history-btn');
  const historyPanel = document.getElementById('history-panel');
  const historyClose = document.getElementById('history-close');
  const historyClear = document.getElementById('history-clear-btn');

  if (historyBtn && historyPanel) {
    historyBtn.addEventListener('click', () => openHistoryPanel());
    historyClose.addEventListener('click', () => closeHistoryPanel());
    historyPanel.addEventListener('click', e => {
      if (e.target === historyPanel) closeHistoryPanel();
    });
    historyClear.addEventListener('click', () => {
      clearHistory();
      renderHistoryGrid([]);
    });
  }
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

// --- History Panel ---

function openHistoryPanel() {
  const panel = document.getElementById('history-panel');
  if (!panel) return;
  renderHistoryGrid(getHistory());
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('history-close').focus();
}

function closeHistoryPanel() {
  const panel = document.getElementById('history-panel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

function renderHistoryGrid(entries) {
  const grid = document.getElementById('history-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'No saves yet — practice a letter and move on to save automatically.';
    grid.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    grid.appendChild(buildHistoryCard(entry));
  }
}

function buildHistoryCard(entry) {
  const card = document.createElement('div');
  card.className = 'history-card';

  const img = document.createElement('img');
  img.src = entry.imageDataUrl;
  img.loading = 'lazy';
  img.alt = `Practice attempt for “${entry.item}”`;
  img.className = 'history-card__img';
  card.appendChild(img);

  const foot = document.createElement('div');
  foot.className = 'history-card__foot';

  const row = document.createElement('div');
  row.className = 'history-card__row';

  const itemEl = document.createElement('span');
  itemEl.className = 'history-card__item';
  itemEl.textContent = entry.item;

  const scoreVal = Math.round((entry.score.overall || 0) * 100);
  const scoreClass = scoreVal >= 80 ? 'good' : scoreVal >= 50 ? 'ok' : 'low';
  const scoreEl = document.createElement('span');
  scoreEl.className = `history-card__score score-value ${scoreClass}`;
  scoreEl.textContent = `${scoreVal}%`;

  row.append(itemEl, scoreEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'history-card__meta';
  metaEl.textContent = `${entry.drillLabel} · ${entry.difficultyLabel}`;

  const dateEl = document.createElement('div');
  dateEl.className = 'history-card__date';
  dateEl.textContent = formatDate(entry.timestamp);

  foot.append(row, metaEl, dateEl);
  card.appendChild(foot);
  return card;
}

function formatDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
