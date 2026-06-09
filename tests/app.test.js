import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDigitToCell,
  clearCell,
  createPlayState,
  findConflicts,
  getSolvedBannerVisible,
  restorePlayState,
  setEntryMode,
  syncSolutionVisibility
} from '../src/ui.js';
import {
  STORAGE_KEY,
  buildSavedState,
  loadAppState,
  normalizeSavedState
} from '../src/browser-app.js';

function makeClassList(initial = []){
  const set = new Set(initial);
  return {
    add(name){ set.add(name); },
    remove(name){ set.delete(name); },
    toggle(name, force){
      if (force === undefined) {
        if (set.has(name)) set.delete(name);
        else set.add(name);
        return set.has(name);
      }
      if (force) set.add(name);
      else set.delete(name);
      return force;
    },
    contains(name){ return set.has(name); }
  };
}

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

const puzzle = [
  [5, 0, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 0, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

test('solution visibility starts hidden when unchecked', () => {
  const el = { classList: makeClassList(['solution', 'hidden']) };
  syncSolutionVisibility(el, false);
  assert.equal(el.classList.contains('visible'), false);
  assert.equal(el.classList.contains('hidden'), true);
});

test('solution visibility becomes visible when enabled', () => {
  const el = { classList: makeClassList(['solution', 'hidden']) };
  syncSolutionVisibility(el, true);
  assert.equal(el.classList.contains('visible'), true);
  assert.equal(el.classList.contains('hidden'), false);
});

test('findConflicts marks every conflicting cell in a row', () => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  grid[0][0] = 5;
  grid[0][1] = 5;
  const conflicts = findConflicts(grid);
  assert.deepEqual([...conflicts].sort(), ['0:0', '0:1']);
});

test('findConflicts marks every conflicting cell in a column', () => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  grid[0][0] = 5;
  grid[1][0] = 5;
  const conflicts = findConflicts(grid);
  assert.deepEqual([...conflicts].sort(), ['0:0', '1:0']);
});

test('findConflicts marks every conflicting cell in a box', () => {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  grid[0][0] = 5;
  grid[1][1] = 5;
  const conflicts = findConflicts(grid);
  assert.deepEqual([...conflicts].sort(), ['0:0', '1:1']);
});

test('notes toggle independently of final values', () => {
  let state = createPlayState(puzzle, solution);
  state = setEntryMode(state, 'note');
  state = applyDigitToCell(state, 0, 1, 1);
  state = applyDigitToCell(state, 0, 1, 3);
  state = applyDigitToCell(state, 0, 1, 1);

  assert.deepEqual([...state.notes[0][1]].sort(), [3]);
  assert.equal(state.finals[0][1], 0);
});

test('promoting a cell to final clears that cell notes', () => {
  let state = createPlayState(puzzle, solution);
  state = setEntryMode(state, 'note');
  state = applyDigitToCell(state, 0, 1, 3);
  state = applyDigitToCell(state, 0, 1, 4);
  state = setEntryMode(state, 'final');
  state = applyDigitToCell(state, 0, 1, 3);

  assert.equal(state.finals[0][1], 3);
  assert.equal(state.notes[0][1].size, 0);
});

test('notes do not affect conflict detection', () => {
  let state = createPlayState(puzzle, solution);
  state = setEntryMode(state, 'note');
  state = applyDigitToCell(state, 0, 1, 5);
  state = applyDigitToCell(state, 4, 4, 5);

  assert.equal(state.conflicts.size, 0);
});

test('solved state requires all editable cells filled', () => {
  const state = createPlayState(puzzle, solution);
  assert.equal(state.isSolved, false);
});

test('solved state rejects a filled but incorrect board', () => {
  let state = createPlayState(puzzle, solution);
  state = applyDigitToCell(state, 0, 1, 4);
  state = applyDigitToCell(state, 4, 4, 5);

  assert.equal(state.conflicts.size > 0, true);
  assert.equal(state.isSolved, false);
});

test('solved state accepts a complete correct board', () => {
  let state = createPlayState(puzzle, solution);
  state = applyDigitToCell(state, 0, 1, 3);
  state = applyDigitToCell(state, 4, 4, 5);

  assert.equal(state.conflicts.size, 0);
  assert.equal(state.isSolved, true);
});

test('solved banner visibility follows solved lifecycle', () => {
  let state = createPlayState(puzzle, solution);
  assert.equal(getSolvedBannerVisible(state), false);

  state = applyDigitToCell(state, 0, 1, 3);
  state = applyDigitToCell(state, 4, 4, 5);
  assert.equal(getSolvedBannerVisible(state), true);

  state = clearCell(state, 4, 4);
  assert.equal(getSolvedBannerVisible(state), false);
});

test('saved state serializes notes and restores them as sets', () => {
  let state = createPlayState(puzzle, solution);
  state = setEntryMode(state, 'note');
  state = applyDigitToCell(state, 0, 1, 2);
  state = applyDigitToCell(state, 0, 1, 7);

  const saved = buildSavedState({
    appMode: 'fill',
    controls: { percent: 60, sym: true, seed: '12345', inclSol: false },
    puzzleData: {
      puzzle,
      solution,
      removed: 2,
      achieved: 2.5,
      seed: 12345
    },
    playState: state
  });

  assert.deepEqual(saved.playState.notes[0][1], [2, 7]);

  const restored = normalizeSavedState(saved);
  assert.ok(restored);
  assert.deepEqual([...restored.playState.notes[0][1]], [2, 7]);
});

test('restorePlayState recomputes conflicts and solved state', () => {
  const finals = Array.from({ length: 9 }, () => Array(9).fill(0));
  finals[0][1] = 5;

  let restored = restorePlayState(
    puzzle,
    solution,
    finals,
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())),
    'final',
    { row: 0, col: 1 }
  );
  assert.deepEqual([...restored.conflicts].sort(), ['0:0', '0:1', '3:1']);
  assert.equal(restored.isSolved, false);

  finals[0][1] = 3;
  finals[4][4] = 5;
  restored = restorePlayState(
    puzzle,
    solution,
    finals,
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())),
    'final',
    { row: 4, col: 4 }
  );
  assert.equal(restored.isSolved, true);
});

test('normalizeSavedState rejects invalid persisted payloads', () => {
  const invalid = {
    appMode: 'bogus',
    controls: { percent: 60, sym: true, seed: '1', inclSol: false },
    puzzleData: {
      puzzle,
      solution,
      removed: 2,
      achieved: 2.5,
      seed: 1
    },
    playState: {
      givens: puzzle,
      solution,
      finals: Array.from({ length: 9 }, () => Array(9).fill(0)),
      notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
      entryMode: 'final',
      selectedCell: null
    }
  };

  assert.equal(normalizeSavedState(invalid), null);
});

test('loadAppState returns saved snapshot and preserves controls and state', () => {
  let state = createPlayState(puzzle, solution);
  state = setEntryMode(state, 'note');
  state = applyDigitToCell(state, 0, 1, 3);

  const snapshot = buildSavedState({
    appMode: 'fill',
    controls: { percent: 55, sym: false, seed: '777', inclSol: true },
    puzzleData: {
      puzzle,
      solution,
      removed: 10,
      achieved: 12.3,
      seed: 777
    },
    playState: state
  });

  const storage = {
    values: new Map([[STORAGE_KEY, JSON.stringify(snapshot)]]),
    getItem(key){ return this.values.get(key) ?? null; },
    setItem(key, value){ this.values.set(key, value); },
    removeItem(key){ this.values.delete(key); }
  };

  const restored = loadAppState(storage);
  assert.equal(restored.appMode, 'fill');
  assert.deepEqual(restored.controls, { percent: 55, sym: false, seed: '777', inclSol: true });
  assert.deepEqual([...restored.playState.notes[0][1]], [3]);
});

test('loadAppState clears corrupt storage and falls back to null', () => {
  const storage = {
    values: new Map([[STORAGE_KEY, '{not-json']]),
    getItem(key){ return this.values.get(key) ?? null; },
    removeItem(key){ this.values.delete(key); }
  };

  assert.equal(loadAppState(storage), null);
  assert.equal(storage.values.has(STORAGE_KEY), false);
});
