import {
  applyDigitToCell,
  clearCell,
  createPlayState,
  getSolvedBannerVisible,
  setEntryMode,
  setSelectedCell,
  syncSolutionVisibility
} from './ui.js';

(function(){
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
  const elEntryMode = document.getElementById('entryMode');
  const elEntryModeInputs = Array.from(document.querySelectorAll('input[name="entryMode"]'));
  const elPrintOptions = document.getElementById('printOptions');
  const elSolvedBanner = document.getElementById('solvedBanner');
  const elSolvedGenerate = document.getElementById('btnSolvedGenerate');
  const elLegendPrint = document.getElementById('legendPrint');
  const elLegendOnline = document.getElementById('legendOnline');

  let appMode = 'print';
  let puzzleData = null;
  let playState = null;

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

    for (let row = 0; row < 9; row++){
      const tr = document.createElement('tr');
      for (let col = 0; col < 9; col++){
        const td = document.createElement('td');
        const button = document.createElement('button');
        const value = finalGrid[row][col];
        const isGiven = state.givens[row][col] !== 0;
        const isSelected = state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col;
        const key = `${row}:${col}`;

        button.type = 'button';
        button.className = 'cell';
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

        if (isGiven) button.classList.add('given');
        else button.classList.add('editable');
        if (isSelected) button.classList.add('selected');
        if (state.conflicts.has(key)) button.classList.add('conflict');

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

  function renderBoard(){
    if (!puzzleData) return;

    if (appMode === 'fill') renderOnlineGrid(elPuzzle, playState);
    else renderStaticGrid(elPuzzle, puzzleData.puzzle);

    renderStaticGrid(elSolution, puzzleData.solution);
    applySolutionVisibility();
    renderSolvedBanner();
  }

  function setMode(mode){
    appMode = mode;
    elApp.classList.toggle('mode-fill', mode === 'fill');
    elApp.classList.toggle('mode-print', mode === 'print');
    elEntryMode.classList.toggle('hidden', mode !== 'fill');
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
      ? `Fill online mode ready. Entry mode: ${playState.entryMode === 'final' ? 'Final' : 'Note'}.`
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
    elStatus.textContent = `Fill online mode ready. Entry mode: ${playState.entryMode === 'final' ? 'Final' : 'Note'}.${conflicts}`;
  }

  function generate(){
    const t0 = performance.now();
    const seedVal = elSeed.value === '' ? null : Number(elSeed.value);
    const rnd = newRNG(seedVal);
    const solution = generateSolved(rnd);
    const result = removeCells(rnd, solution, Number(elPercent.value), elSym.checked, 5);
    const t1 = performance.now();

    puzzleData = {
      puzzle: result.puzzle,
      solution,
      removed: result.removed,
      achieved: result.achieved,
      seed: seedVal
    };
    playState = createPlayState(result.puzzle, solution);

    for (const input of elEntryModeInputs) input.checked = input.value === playState.entryMode;

    elMeta.textContent = `Removed: ${result.removed} cells (${result.achieved.toFixed(1)}%). Seed: ${seedVal ?? 'random'}. Symmetry: ${elSym.checked ? 'on' : 'off'}.`;
    updateStatusMessage(t1 - t0);
    renderBoard();
  }

  function selectCellFromTarget(target){
    const cell = target.closest('.cell');
    if (!cell || appMode !== 'fill' || !playState) return;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    playState = setSelectedCell(playState, row, col);
    renderBoard();
  }

  function handleBoardKeydown(event){
    if (appMode !== 'fill' || !playState || !playState.selectedCell) return;

    const { row, col } = playState.selectedCell;
    if (/^[1-9]$/.test(event.key)) {
      playState = applyDigitToCell(playState, row, col, Number(event.key));
      event.preventDefault();
      updatePlayStatus();
      renderBoard();
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
      playState = clearCell(playState, row, col);
      event.preventDefault();
      updatePlayStatus();
      renderBoard();
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
  }

  elPercent.addEventListener('input', () => {
    elPercentLabel.textContent = `${elPercent.value}%`;
  });

  elBtnSeed.addEventListener('click', () => {
    elSeed.value = Math.floor(Math.random() * 1e9);
  });

  elBtnPrint.addEventListener('click', () => {
    window.print();
  });

  elInclSol.addEventListener('change', applySolutionVisibility);
  elBtnGen.addEventListener('click', generate);
  elSolvedGenerate.addEventListener('click', generate);
  elPuzzle.addEventListener('click', (event) => {
    selectCellFromTarget(event.target);
  });
  elPuzzle.addEventListener('keydown', handleBoardKeydown);

  for (const input of elModeInputs){
    input.addEventListener('change', () => {
      if (input.checked) {
        setMode(input.value);
        if (appMode === 'fill') updatePlayStatus();
        else if (puzzleData) elStatus.textContent = 'Print mode ready. Generate a puzzle or print the current one.';
      }
    });
  }

  for (const input of elEntryModeInputs){
    input.addEventListener('change', () => {
      if (!input.checked || !playState) return;
      playState = setEntryMode(playState, input.value);
      updatePlayStatus();
    });
  }

  setMode('print');
  applySolutionVisibility();
  generate();
})();
