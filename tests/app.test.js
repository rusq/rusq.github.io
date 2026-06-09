import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDigitToCell,
  clearCell,
  createPlayState,
  findConflicts,
  getSolvedBannerVisible,
  setEntryMode,
  syncSolutionVisibility
} from '../src/ui.js';

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
