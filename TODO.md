## Potential improvements

- [x] Add named difficulty levels instead of only percentage-based cell removal, starting with simple `Easy`, `Medium`, and `Hard` presets.
- [ ] Improve difficulty accuracy by rating puzzles based on human-solving techniques rather than only blank count.
- [ ] Add progressive hints in online mode, such as conflict help, candidate display for the selected cell, or a naked-single hint.
- [x] Add keyboard quality-of-life features: number/peer highlighting, undo (`Ctrl+Z`/`U`), and quick entry-mode switching (`N`).
- [ ] Add tabbing to the next editable cell in online mode.
- [x] Add an on-screen number pad so the puzzle is playable on touch devices.
- [x] Persist the current puzzle, seed, and in-progress play state in `localStorage`.
- [x] Add more print layouts: 2-up and 4-up puzzles per page with matching solution pages.
- [x] Improve accessibility: cell labels announce value, given/entered, and conflicts; status updates use `role="status"`.
- [ ] Expand automated tests for browser behavior, especially mode switching, keyboard navigation, and rendering behavior.
- [ ] Add shareable puzzle URLs (e.g. `?seed=…&percent=…`) so a puzzle can be sent to someone else.
