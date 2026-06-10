import {
  applyDigitToCell,
  clearCell,
  createPlayState,
  getHighlights,
  getSolvedBannerVisible,
  percentForPreset,
  presetForPercent,
  pushHistory,
  restorePlayState,
  setEntryMode,
  setSelectedCell,
  syncSolutionVisibility
} from './ui.js';

export const STORAGE_KEY = 'sudoku-generator-state-v1';

function cloneGrid(grid){
  return grid.map((row) => row.slice());
}

function isDigit(value){
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

function isCellDigit(value){
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function isGrid(value){
  return Array.isArray(value)
    && value.length === 9
    && value.every((row) => Array.isArray(row) && row.length === 9 && row.every(isDigit));
}

function isNotesGrid(value){
  return Array.isArray(value)
    && value.length === 9
    && value.every((row) => Array.isArray(row)
      && row.length === 9
      && row.every((cell) => Array.isArray(cell)
        && cell.every(isCellDigit)
        && new Set(cell).size === cell.length));
}

function cloneNotesForStorage(notes){
  return notes.map((row) => row.map((cell) => [...cell].sort((a, b) => a - b)));
}

function restoreNotesFromStorage(notes){
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

function isSelectedCell(value){
  return value === null || (
    value
    && Number.isInteger(value.row)
    && Number.isInteger(value.col)
    && value.row >= 0
    && value.row <= 8
    && value.col >= 0
    && value.col <= 8
  );
}

function isEntryMode(value){
  return value === 'final' || value === 'note';
}

function isAppMode(value){
  return value === 'print' || value === 'fill';
}

function isPercent(value){
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isSeedControl(value){
  return typeof value === 'string';
}

function isPuzzleSeed(value){
  return value === null || Number.isFinite(value);
}

function isBoolean(value){
  return typeof value === 'boolean';
}

function isFiniteNumber(value){
  return Number.isFinite(value);
}

const PER_PAGE_VALUES = [1, 2, 4];

function normalizePerPage(value){
  return PER_PAGE_VALUES.includes(value) ? value : 1;
}

function normalizeExtras(value){
  if (!Array.isArray(value)) return [];
  const valid = value.every((entry) => entry
    && typeof entry === 'object'
    && isGrid(entry.puzzle)
    && isGrid(entry.solution));
  if (!valid) return [];
  return value.map((entry) => ({
    puzzle: cloneGrid(entry.puzzle),
    solution: cloneGrid(entry.solution)
  }));
}

export function buildSavedState({ appMode, controls, puzzleData, playState }){
  return {
    appMode,
    controls: {
      percent: controls.percent,
      sym: controls.sym,
      seed: controls.seed,
      inclSol: controls.inclSol,
      perPage: controls.perPage ?? 1
    },
    puzzleData: {
      puzzle: cloneGrid(puzzleData.puzzle),
      solution: cloneGrid(puzzleData.solution),
      removed: puzzleData.removed,
      achieved: puzzleData.achieved,
      seed: puzzleData.seed,
      extras: (puzzleData.extras ?? []).map((entry) => ({
        puzzle: cloneGrid(entry.puzzle),
        solution: cloneGrid(entry.solution)
      }))
    },
    playState: {
      givens: cloneGrid(playState.givens),
      solution: cloneGrid(playState.solution),
      finals: cloneGrid(playState.finals),
      notes: cloneNotesForStorage(playState.notes),
      entryMode: playState.entryMode,
      selectedCell: playState.selectedCell ? { ...playState.selectedCell } : null
    }
  };
}

export function normalizeSavedState(value){
  if (!value || typeof value !== 'object') return null;

  const { appMode, controls, puzzleData, playState } = value;
  if (!isAppMode(appMode)) return null;
  if (!controls || typeof controls !== 'object') return null;
  if (!puzzleData || typeof puzzleData !== 'object') return null;
  if (!playState || typeof playState !== 'object') return null;

  if (!isPercent(controls.percent) || !isBoolean(controls.sym) || !isSeedControl(controls.seed) || !isBoolean(controls.inclSol)) {
    return null;
  }

  if (!isGrid(puzzleData.puzzle)
    || !isGrid(puzzleData.solution)
    || !isFiniteNumber(puzzleData.removed)
    || !isFiniteNumber(puzzleData.achieved)
    || !isPuzzleSeed(puzzleData.seed)) {
    return null;
  }

  if (!isGrid(playState.givens)
    || !isGrid(playState.solution)
    || !isGrid(playState.finals)
    || !isNotesGrid(playState.notes)
    || !isEntryMode(playState.entryMode)
    || !isSelectedCell(playState.selectedCell)) {
    return null;
  }

  return {
    appMode,
    controls: {
      percent: controls.percent,
      sym: controls.sym,
      seed: controls.seed,
      inclSol: controls.inclSol,
      perPage: normalizePerPage(controls.perPage)
    },
    puzzleData: {
      puzzle: cloneGrid(puzzleData.puzzle),
      solution: cloneGrid(puzzleData.solution),
      removed: puzzleData.removed,
      achieved: puzzleData.achieved,
      seed: puzzleData.seed,
      extras: normalizeExtras(puzzleData.extras)
    },
    playState: {
      givens: cloneGrid(playState.givens),
      solution: cloneGrid(playState.solution),
      finals: cloneGrid(playState.finals),
      notes: restoreNotesFromStorage(playState.notes),
      entryMode: playState.entryMode,
      selectedCell: playState.selectedCell ? { ...playState.selectedCell } : null
    }
  };
}

export function clearSavedState(storage = globalThis.localStorage){
  if (!storage || typeof storage.removeItem !== 'function') return;
  storage.removeItem(STORAGE_KEY);
}

export function loadAppState(storage = globalThis.localStorage){
  if (!storage || typeof storage.getItem !== 'function') return null;

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeSavedState(parsed);
    if (!normalized) clearSavedState(storage);
    return normalized;
  } catch {
    clearSavedState(storage);
    return null;
  }
}

export function saveAppState(storage = globalThis.localStorage, snapshot){
  if (!storage || typeof storage.setItem !== 'function' || !snapshot) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function getNow(){
  if (globalThis.performance && typeof globalThis.performance.now === 'function') {
    return globalThis.performance.now();
  }
  return Date.now();
}

function initBrowserApp(){
  const { generateSolved, newRNG, removeCells } = globalThis.SudokuCore;

  const elPercent = document.getElementById('percent');
  const elPercentLabel = document.getElementById('percentLabel');
  const elSym = document.getElementById('sym');
  const elSeed = document.getElementById('seed');
  const elBtnSeed = document.getElementById('btnSeed');
  const elBtnGen = document.getElementById('btnGenerate');
  const elBtnPrint = document.getElementById('btnPrint');
  const elStatus = document.getElementById('status');
  const elMeta = document.getElementById('meta');
  const elPuzzle = document.getElementById('puzzle');
  const elSolution = document.getElementById('solution');
  const elInclSol = document.getElementById('inclSol');
  const elSolBlock = document.getElementById('solutionBlock');
  const elApp = document.body;
  const elModeInputs = Array.from(document.querySelectorAll('input[name="mode"]'));
  const elDifficultyInputs = Array.from(document.querySelectorAll('input[name="difficulty"]'));
  const elEntryMode = document.getElementById('entryMode');
  const elEntryModeInputs = Array.from(document.querySelectorAll('input[name="entryMode"]'));
  const elPrintOptions = document.getElementById('printOptions');
  const elSolvedBanner = document.getElementById('solvedBanner');
  const elSolvedGenerate = document.getElementById('btnSolvedGenerate');
  const elLegendPrint = document.getElementById('legendPrint');
  const elLegendOnline = document.getElementById('legendOnline');
  const elNumberPad = document.getElementById('numberPad');
  const elPadNote = document.getElementById('padNote');
  const elPerPage = document.getElementById('perPage');
  const elPrintSheet = document.getElementById('printSheet');

  const HISTORY_CAP = 100;

  let appMode = 'print';
  let puzzleData = null;
  let playState = null;
  let playHistory = [];

  function getControlsState(){
    return {
      percent: Number(elPercent.value),
      sym: elSym.checked,
      seed: elSeed.value,
      inclSol: elInclSol.checked,
      perPage: Number(elPerPage.value)
    };
  }

  function syncMultiPrintClass(){
    document.body.classList.toggle('multi-print', Number(elPerPage.value) > 1);
  }

  function updatePercentLabel(){
    elPercentLabel.textContent = `${elPercent.value}%`;
  }

  function syncDifficultyInputs(){
    const preset = presetForPercent(Number(elPercent.value));
    for (const input of elDifficultyInputs) input.checked = input.value === preset;
  }

  function applyControlsState(controls){
    elPercent.value = String(controls.percent);
    elSym.checked = controls.sym;
    elSeed.value = controls.seed;
    elInclSol.checked = controls.inclSol;
    elPerPage.value = String(controls.perPage ?? 1);
    updatePercentLabel();
    syncDifficultyInputs();
    syncMultiPrintClass();
  }

  function syncModeInputs(){
    for (const input of elModeInputs) input.checked = input.value === appMode;
  }

  function syncEntryModeInputs(){
    for (const input of elEntryModeInputs) input.checked = !!playState && input.value === playState.entryMode;
    elPadNote.setAttribute('aria-pressed', playState && playState.entryMode === 'note' ? 'true' : 'false');
  }

  function updateMetaText(){
    if (!puzzleData) return;
    elMeta.textContent = `Removed: ${puzzleData.removed} cells (${puzzleData.achieved.toFixed(1)}%). Seed: ${puzzleData.seed ?? 'random'}. Symmetry: ${elSym.checked ? 'on' : 'off'}.`;
  }

  function collectSnapshot(){
    if (!puzzleData || !playState) return null;
    return buildSavedState({
      appMode,
      controls: getControlsState(),
      puzzleData,
      playState
    });
  }

  function persistCurrentState(){
    saveAppState(globalThis.localStorage, collectSnapshot());
  }

  function renderStaticGrid(container, grid){
    const table = document.createElement('table');
    for (let row = 0; row < 9; row++){
      const tr = document.createElement('tr');
      for (let col = 0; col < 9; col++){
        const td = document.createElement('td');
        td.textContent = grid[row][col] ? String(grid[row][col]) : '\u00A0';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    container.classList.remove('online');
    container.innerHTML = '';
    container.appendChild(table);
  }

  function renderNotes(noteSet){
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-notes';

    for (let digit = 1; digit <= 9; digit++){
      const span = document.createElement('span');
      span.textContent = noteSet.has(digit) ? String(digit) : '';
      wrapper.appendChild(span);
    }
    return wrapper;
  }

  function renderOnlineGrid(container, state){
    const table = document.createElement('table');
    const finalGrid = state.givens.map((row, rowIndex) => row.map((value, colIndex) => value || state.finals[rowIndex][colIndex]));
    const highlights = getHighlights(state);

    for (let row = 0; row < 9; row++){
      const tr = document.createElement('tr');
      for (let col = 0; col < 9; col++){
        const td = document.createElement('td');
        const button = document.createElement('button');
        const value = finalGrid[row][col];
        const isGiven = state.givens[row][col] !== 0;
        const isSelected = state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col;
        const key = `${row}:${col}`;
        const hasConflict = state.conflicts.has(key);

        const labelParts = [`Row ${row + 1}, column ${col + 1}`];
        if (value === 0) labelParts.push('empty');
        else labelParts.push(`value ${value}`, isGiven ? 'given' : 'entered');
        if (hasConflict) labelParts.push('conflict');

        button.type = 'button';
        button.className = 'cell';
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute('aria-label', labelParts.join(', '));
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

        if (isGiven) button.classList.add('given');
        else button.classList.add('editable');
        if (highlights.peers.has(key)) button.classList.add('peer');
        if (highlights.sameValue.has(key)) button.classList.add('same-value');
        if (isSelected) button.classList.add('selected');
        if (hasConflict) button.classList.add('conflict');

        if (value !== 0) {
          const span = document.createElement('span');
          span.className = isGiven ? 'cell-value given-value' : 'cell-value final-value';
          span.textContent = String(value);
          button.appendChild(span);
        } else {
          button.appendChild(renderNotes(state.notes[row][col]));
        }

        td.appendChild(button);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }

    container.classList.add('online');
    container.innerHTML = '';
    container.appendChild(table);

    if (state.selectedCell) {
      const selector = `.cell[data-row="${state.selectedCell.row}"][data-col="${state.selectedCell.col}"]`;
      const selected = container.querySelector(selector);
      if (selected && document.activeElement !== selected) selected.focus();
    }
  }

  function applySolutionVisibility(){
    const includeSolution = appMode === 'print' && elInclSol.checked;
    syncSolutionVisibility(elSolBlock, includeSolution);
  }

  function renderSolvedBanner(){
    const visible = appMode === 'fill' && playState && getSolvedBannerVisible(playState);
    elSolvedBanner.classList.toggle('visible', visible);
    elSolvedBanner.classList.toggle('hidden', !visible);
  }

  function renderPrintSheet(){
    elPrintSheet.innerHTML = '';
    if (!puzzleData) return;

    const perPage = Number(elPerPage.value);
    if (perPage <= 1) return;

    const entries = [
      { puzzle: puzzleData.puzzle, solution: puzzleData.solution },
      ...(puzzleData.extras ?? [])
    ].slice(0, perPage);

    function appendSection(titleText, gridKey){
      const title = document.createElement('div');
      title.className = 'sheet-title';
      title.textContent = titleText;
      elPrintSheet.appendChild(title);

      const grids = document.createElement('div');
      grids.className = `sheet-grids per-${perPage}`;
      for (const entry of entries){
        const grid = document.createElement('div');
        grid.className = 'grid';
        renderStaticGrid(grid, entry[gridKey]);
        grids.appendChild(grid);
      }
      elPrintSheet.appendChild(grids);
    }

    appendSection('Sudoku', 'puzzle');

    if (elInclSol.checked) {
      const pageBreak = document.createElement('div');
      pageBreak.className = 'page-break';
      elPrintSheet.appendChild(pageBreak);
      appendSection('Solutions', 'solution');
    }
  }

  function buildExtras(rnd, count){
    const extras = [];
    for (let i = 0; i < count; i++){
      const solved = generateSolved(rnd);
      const result = removeCells(rnd, solved, Number(elPercent.value), elSym.checked, 5);
      extras.push({ puzzle: result.puzzle, solution: solved });
    }
    return extras;
  }

  function ensureExtras(){
    if (!puzzleData) return;
    const needed = Number(elPerPage.value) - 1 - (puzzleData.extras?.length ?? 0);
    if (needed <= 0) return;
    puzzleData.extras = (puzzleData.extras ?? []).concat(buildExtras(newRNG(null), needed));
  }

  function renderBoard(){
    if (!puzzleData) return;

    if (appMode === 'fill') renderOnlineGrid(elPuzzle, playState);
    else renderStaticGrid(elPuzzle, puzzleData.puzzle);

    renderStaticGrid(elSolution, puzzleData.solution);
    applySolutionVisibility();
    renderSolvedBanner();
    renderPrintSheet();
  }

  function setMode(mode){
    appMode = mode;
    syncModeInputs();
    elApp.classList.toggle('mode-fill', mode === 'fill');
    elApp.classList.toggle('mode-print', mode === 'print');
    elEntryMode.classList.toggle('hidden', mode !== 'fill');
    elNumberPad.classList.toggle('hidden', mode !== 'fill');
    elPrintOptions.classList.toggle('hidden', mode !== 'print');
    elBtnPrint.classList.toggle('hidden', mode !== 'print');
    elLegendPrint.classList.toggle('hidden', mode !== 'print');
    elLegendOnline.classList.toggle('hidden', mode !== 'fill');
    applySolutionVisibility();
    renderBoard();
  }

  function updateStatusMessage(durationMs){
    if (!puzzleData) return;

    const modeText = appMode === 'fill'
      ? `Play online mode ready. Entry mode: ${playState.entryMode === 'final' ? 'Final' : 'Note'}.`
      : 'Unique-solution ensured.';
    elStatus.textContent = `Generated in ${durationMs.toFixed(0)} ms. ${modeText}`;
  }

  function updatePlayStatus(){
    if (!playState) return;

    if (playState.isSolved) {
      elStatus.textContent = 'Puzzle solved. Generate a new one when ready.';
      return;
    }

    const conflicts = playState.conflicts.size > 0 ? ' Conflicts are highlighted.' : '';
    elStatus.textContent = `Play online mode ready. Entry mode: ${playState.entryMode === 'final' ? 'Final' : 'Note'}.${conflicts}`;
  }

  function updatePrintStatus(isRestored = false){
    if (!puzzleData) return;
    elStatus.textContent = isRestored
      ? 'Saved puzzle restored. Print mode ready.'
      : 'Print mode ready. Generate a puzzle or print the current one.';
  }

  function generate(){
    const t0 = getNow();
    const seedVal = elSeed.value === '' ? null : Number(elSeed.value);
    const rnd = newRNG(seedVal);
    const solution = generateSolved(rnd);
    const result = removeCells(rnd, solution, Number(elPercent.value), elSym.checked, 5);
    const t1 = getNow();

    puzzleData = {
      puzzle: result.puzzle,
      solution,
      removed: result.removed,
      achieved: result.achieved,
      seed: seedVal,
      extras: buildExtras(rnd, Number(elPerPage.value) - 1)
    };
    playState = createPlayState(result.puzzle, solution);
    playHistory = [];

    syncEntryModeInputs();
    updateMetaText();
    updateStatusMessage(t1 - t0);
    renderBoard();
    persistCurrentState();
  }

  function restoreSession(savedState){
    applyControlsState(savedState.controls);
    puzzleData = savedState.puzzleData;
    playState = restorePlayState(
      savedState.playState.givens,
      savedState.playState.solution,
      savedState.playState.finals,
      savedState.playState.notes,
      savedState.playState.entryMode,
      savedState.playState.selectedCell
    );
    playHistory = [];
    syncEntryModeInputs();
    updateMetaText();
    setMode(savedState.appMode);
    if (appMode === 'fill') updatePlayStatus();
    else updatePrintStatus(true);
  }

  function restoreOrGenerate(){
    const savedState = loadAppState(globalThis.localStorage);
    if (savedState) {
      restoreSession(savedState);
      return;
    }
    generate();
  }

  function selectCellFromTarget(target){
    const cell = target.closest('.cell');
    if (!cell || appMode !== 'fill' || !playState) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    playState = setSelectedCell(playState, row, col);
    renderBoard();
    persistCurrentState();
  }

  function applyInput(action){
    if (appMode !== 'fill' || !playState || !playState.selectedCell) return;

    const { row, col } = playState.selectedCell;
    const next = action === 'erase'
      ? clearCell(playState, row, col)
      : applyDigitToCell(playState, row, col, action);
    if (next === playState) return;

    playHistory = pushHistory(playHistory, playState, HISTORY_CAP);
    playState = next;
    updatePlayStatus();
    renderBoard();
    persistCurrentState();
  }

  function undoInput(){
    if (appMode !== 'fill' || playHistory.length === 0) return;

    playState = playHistory[playHistory.length - 1];
    playHistory = playHistory.slice(0, -1);
    syncEntryModeInputs();
    updatePlayStatus();
    renderBoard();
    persistCurrentState();
  }

  function toggleEntryMode(){
    if (appMode !== 'fill' || !playState) return;

    playState = setEntryMode(playState, playState.entryMode === 'note' ? 'final' : 'note');
    syncEntryModeInputs();
    updatePlayStatus();
    persistCurrentState();
  }

  function handleBoardKeydown(event){
    if (appMode !== 'fill' || !playState) return;

    if ((event.key === 'z' || event.key === 'Z') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      undoInput();
      return;
    }

    if (event.key === 'u' || event.key === 'U') {
      event.preventDefault();
      undoInput();
      return;
    }

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      toggleEntryMode();
      return;
    }

    if (!playState.selectedCell) return;

    const { row, col } = playState.selectedCell;
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      applyInput(Number(event.key));
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      event.preventDefault();
      applyInput('erase');
      return;
    }

    const deltas = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    };
    if (!deltas[event.key]) return;

    const [rowDelta, colDelta] = deltas[event.key];
    const nextRow = Math.max(0, Math.min(8, row + rowDelta));
    const nextCol = Math.max(0, Math.min(8, col + colDelta));
    playState = setSelectedCell(playState, nextRow, nextCol);
    event.preventDefault();
    renderBoard();
    persistCurrentState();
  }

  elPercent.addEventListener('input', () => {
    updatePercentLabel();
    syncDifficultyInputs();
    persistCurrentState();
  });

  for (const input of elDifficultyInputs){
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const percent = percentForPreset(input.value);
      if (percent !== null) {
        elPercent.value = String(percent);
        updatePercentLabel();
      }
      persistCurrentState();
    });
  }

  elSym.addEventListener('change', persistCurrentState);

  elSeed.addEventListener('input', persistCurrentState);

  elBtnSeed.addEventListener('click', () => {
    elSeed.value = String(Math.floor(Math.random() * 1e9));
    persistCurrentState();
  });

  elBtnPrint.addEventListener('click', () => {
    ensureExtras();
    renderPrintSheet();
    persistCurrentState();
    window.print();
  });

  elInclSol.addEventListener('change', () => {
    applySolutionVisibility();
    renderPrintSheet();
    persistCurrentState();
  });

  elPerPage.addEventListener('change', () => {
    syncMultiPrintClass();
    ensureExtras();
    renderPrintSheet();
    persistCurrentState();
  });
  elBtnGen.addEventListener('click', generate);
  elSolvedGenerate.addEventListener('click', generate);
  elPuzzle.addEventListener('click', (event) => {
    selectCellFromTarget(event.target);
  });
  elPuzzle.addEventListener('keydown', handleBoardKeydown);
  elNumberPad.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.digit) applyInput(Number(button.dataset.digit));
    else if (button.dataset.action === 'erase') applyInput('erase');
    else if (button.dataset.action === 'note') toggleEntryMode();
    else if (button.dataset.action === 'undo') undoInput();
  });

  for (const input of elModeInputs){
    input.addEventListener('change', () => {
      if (input.checked) {
        setMode(input.value);
        if (appMode === 'fill') updatePlayStatus();
        else updatePrintStatus();
        persistCurrentState();
      }
    });
  }

  for (const input of elEntryModeInputs){
    input.addEventListener('change', () => {
      if (!input.checked || !playState) return;
      playState = setEntryMode(playState, input.value);
      syncEntryModeInputs();
      updatePlayStatus();
      persistCurrentState();
    });
  }

  setMode('print');
  applySolutionVisibility();
  syncDifficultyInputs();
  restoreOrGenerate();
}

if (typeof document !== 'undefined') {
  initBrowserApp();
}
