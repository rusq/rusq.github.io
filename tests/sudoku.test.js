import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, '../src/sudoku-core.js'), 'utf8');
const context = vm.createContext({
  Uint16Array,
  Uint32Array,
  Array,
  Math,
  Date,
  Number,
  globalThis: {},
  crypto: undefined
});
vm.runInContext(source, context);

const { countSolutions, generateSolved, newRNG, removeCells } = context.globalThis.SudokuCore;

function countBlanks(grid){
  let blanks = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c] === 0) blanks++;
  return blanks;
}

test('generateSolved returns a valid solved board', () => {
  const solved = generateSolved(newRNG(12345));
  assert.equal(countSolutions(solved, 2), 1);
});

test('countSolutions rejects contradictory givens', () => {
  const invalid = [
    [1, 1, 3, 4, 5, 6, 7, 8, 9],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 2, 1, 3, 4, 5, 6, 7, 8]
  ];
  assert.equal(countSolutions(invalid, 2), 0);
});

test('same seed produces the same puzzle', () => {
  const solvedA = generateSolved(newRNG(42));
  const solvedB = generateSolved(newRNG(42));
  const puzzleA = removeCells(newRNG(42), solvedA, 60, true, 5).puzzle;
  const puzzleB = removeCells(newRNG(42), solvedB, 60, true, 5).puzzle;
  assert.deepEqual(puzzleA, puzzleB);
});

test('removeCells preserves uniqueness and respects the clue floor', () => {
  const solved = generateSolved(newRNG(7));
  const { puzzle, removed } = removeCells(newRNG(7), solved, 79, false, 5);
  assert.equal(countSolutions(puzzle, 2), 1);
  assert.ok(removed <= 64);
  assert.ok(countBlanks(puzzle) <= 64);
});

test('symmetric removal keeps 180-degree blank symmetry', () => {
  const solved = generateSolved(newRNG(99));
  const { puzzle } = removeCells(newRNG(99), solved, 60, true, 5);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      assert.equal(puzzle[r][c] === 0, puzzle[8 - r][8 - c] === 0);
    }
  }
});
