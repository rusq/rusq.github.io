export function syncSolutionVisibility(solutionBlock, includeSolution){
  solutionBlock.classList.toggle('visible', includeSolution);
  solutionBlock.classList.toggle('hidden', !includeSolution);
}

function cloneGrid(grid){
  return grid.map((row) => row.slice());
}

function emptyGrid(){
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function emptyNotes(){
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
}

function cloneNotes(notes){
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

function cellKey(row, col){
  return `${row}:${col}`;
}

function createConflictSet(groups){
  const conflicts = new Set();
  for (const group of groups){
    const seen = new Map();
    for (const cell of group){
      if (cell.value === 0) continue;
      const existing = seen.get(cell.value);
      if (existing) {
        conflicts.add(cellKey(existing.row, existing.col));
        conflicts.add(cellKey(cell.row, cell.col));
      } else {
        seen.set(cell.value, cell);
      }
    }
  }
  return conflicts;
}

export function buildFinalGrid(givens, finals){
  return givens.map((row, rowIndex) => row.map((value, colIndex) => value || finals[rowIndex][colIndex]));
}

export function findConflicts(grid){
  const groups = [];

  for (let row = 0; row < 9; row++){
    groups.push(grid[row].map((value, col) => ({ row, col, value })));
  }

  for (let col = 0; col < 9; col++){
    const group = [];
    for (let row = 0; row < 9; row++) group.push({ row, col, value: grid[row][col] });
    groups.push(group);
  }

  for (let boxRow = 0; boxRow < 3; boxRow++){
    for (let boxCol = 0; boxCol < 3; boxCol++){
      const group = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row++){
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col++){
          group.push({ row, col, value: grid[row][col] });
        }
      }
      groups.push(group);
    }
  }

  return createConflictSet(groups);
}

export function hasAllEditableCellsFilled(givens, finals){
  for (let row = 0; row < 9; row++){
    for (let col = 0; col < 9; col++){
      if (givens[row][col] === 0 && finals[row][col] === 0) return false;
    }
  }
  return true;
}

export function isSolvedGrid(givens, finals, solution){
  if (!hasAllEditableCellsFilled(givens, finals)) return false;
  const finalGrid = buildFinalGrid(givens, finals);
  if (findConflicts(finalGrid).size > 0) return false;

  for (let row = 0; row < 9; row++){
    for (let col = 0; col < 9; col++){
      if (finalGrid[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
}

function deriveState(state){
  const conflicts = findConflicts(buildFinalGrid(state.givens, state.finals));
  return {
    ...state,
    conflicts,
    isSolved: isSolvedGrid(state.givens, state.finals, state.solution)
  };
}

export function createPlayState(givens, solution){
  return deriveState({
    givens: cloneGrid(givens),
    solution: cloneGrid(solution),
    finals: emptyGrid(),
    notes: emptyNotes(),
    entryMode: 'final',
    selectedCell: null,
    conflicts: new Set(),
    isSolved: false
  });
}

export function restorePlayState(givens, solution, finals, notes, entryMode, selectedCell){
  return deriveState({
    givens: cloneGrid(givens),
    solution: cloneGrid(solution),
    finals: cloneGrid(finals),
    notes: cloneNotes(notes),
    entryMode,
    selectedCell: selectedCell ? { row: selectedCell.row, col: selectedCell.col } : null,
    conflicts: new Set(),
    isSolved: false
  });
}

export function setSelectedCell(state, row, col){
  return {
    ...state,
    selectedCell: row == null || col == null ? null : { row, col }
  };
}

export function setEntryMode(state, entryMode){
  return {
    ...state,
    entryMode
  };
}

export function getSolvedBannerVisible(state){
  return state.isSolved;
}

export function clearCell(state, row, col){
  if (state.givens[row][col] !== 0) return state;

  const finals = cloneGrid(state.finals);
  const notes = cloneNotes(state.notes);

  if (finals[row][col] !== 0) finals[row][col] = 0;
  else notes[row][col].clear();

  return deriveState({
    ...state,
    finals,
    notes
  });
}

export function applyDigitToCell(state, row, col, digit){
  if (state.givens[row][col] !== 0) return state;

  const finals = cloneGrid(state.finals);
  const notes = cloneNotes(state.notes);

  if (state.entryMode === 'note') {
    if (finals[row][col] !== 0) return state;
    if (notes[row][col].has(digit)) notes[row][col].delete(digit);
    else notes[row][col].add(digit);
    return deriveState({
      ...state,
      finals,
      notes
    });
  }

  finals[row][col] = digit;
  notes[row][col].clear();

  return deriveState({
    ...state,
    finals,
    notes
  });
}
