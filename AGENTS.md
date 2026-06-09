# Repository Guidelines

## Project Structure & Module Organization

This repository is a static printable Sudoku generator. `index.html` contains the page markup and most screen styles. `print.css` contains print-only layout rules. JavaScript lives in `src/`: `sudoku-core.js` holds puzzle generation and solving logic, `browser-app.js` wires the DOM UI, and `ui.js` contains testable UI helpers. Tests live in `tests/` and mirror the runtime areas, for example `tests/sudoku.test.js` and `tests/app.test.js`.

## Build, Test, and Development Commands

- `npm test`: runs the full test suite with Node’s built-in `node:test` runner.
- `node --test tests/sudoku.test.js`: runs only the Sudoku core tests.
- `python3 -m http.server 8000`: serves the repository locally; open `http://localhost:8000/` to test the browser UI and print layout.

There is no bundler or build step. Keep browser-loaded files available at their current paths unless you also update `index.html`.

## Coding Style & Naming Conventions

Use vanilla JavaScript and ES modules for test files. Runtime browser files are loaded directly by `<script>` tags, so preserve global exposure where existing code depends on it, such as `globalThis.SudokuCore`. Follow the existing style: two-space indentation, semicolons, compact helper functions, `camelCase` for variables and functions, and descriptive test names. Keep CSS class names lowercase and hyphenated when adding new styles.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`; no external test framework is configured. Name new tests `*.test.js` under `tests/`. Prefer deterministic tests by passing explicit RNG seeds to Sudoku generation. Add or update tests when changing puzzle generation, uniqueness checks, print visibility behavior, or DOM-independent UI helpers.

## Commit & Pull Request Guidelines

The current history uses short, imperative or descriptive commit messages, for example `add test sudoku` and `tests and bugfixes`. Keep commits focused and concise. Before opening a pull request, run `npm test`, describe the user-visible change, mention any puzzle-generation or print-layout impact, and include screenshots or print-preview notes for UI/CSS changes. Link related issues when applicable.

## Agent-Specific Instructions

Do not introduce a package manager lockfile, bundler, or framework unless the task explicitly requires it. Avoid moving inline CSS or browser scripts without preserving the static GitHub Pages-style deployment path.
