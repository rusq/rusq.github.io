# Sudoku Generator Printable

A small static web app for generating printable Sudoku puzzles with optional solution pages. It runs directly in the browser and is suitable for GitHub Pages-style hosting.

## Features

- Generates valid Sudoku puzzles with unique solutions.
- Supports deterministic generation with an optional numeric seed.
- Offers adjustable cell removal percentage and 180-degree symmetry.
- Includes print-specific CSS for clean A4 puzzle output.
- Uses no bundler or runtime dependencies.

## Project Structure

- `index.html`: main page markup and screen styles.
- `print.css`: print-only layout and page rules.
- `src/sudoku-core.js`: Sudoku generation, solving, and cell-removal logic.
- `src/browser-app.js`: browser UI wiring and rendering.
- `src/ui.js`: DOM-independent UI helpers.
- `tests/`: Node test files for core logic and UI helpers.

## Development

Run the test suite:

```sh
npm test
```

Run a single test file:

```sh
node --test tests/sudoku.test.js
```

Serve locally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Deployment

The app is static. Deploy the repository contents to any static host, including GitHub Pages. Keep `src/`, `print.css`, and `index.html` paths intact unless the script and stylesheet references are updated.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
