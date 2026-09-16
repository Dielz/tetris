# Tetris in the Browser

## Overview
This repository contains a **browser‑based implementation of the classic Tetris game** written in vanilla HTML, CSS and JavaScript.

The goal is to provide a lightweight, fully client‑side version that runs directly in any modern browser without external dependencies or build tools.  The code follows a modular ES‑module structure, keeps all state inside a `Game` class, and exposes a small public API so the logic can be unit‑tested easily.

## Features
- Classic Tetris mechanics (7 tetrominoes, rotation, collision detection)
- Score system with level progression and line‑clear bonuses
- Responsive layout that works on desktop and mobile browsers
- Sound effects for line clears, piece placement and game over
- Persistent high scores via `localStorage`
- No external build step – open `index.html` in a browser to play

## Project Structure
```
├─ src/
│  ├─ index.html          # Entry point
│  ├─ styles.css          # Layout & theming
│  ├─ game.js             # Main loop and state machine
│  ├─ tetrominoes.js      # Shape definitions
│  ├─ grid.js             # Play‑field matrix helpers
│  └─ utils.js            # Common utilities (rotate, collision test, etc.)
├─ doc/                   # Markdown documentation generated from the blueprint
└─ README.md              # This file
```

## How to Run
1. Clone the repo.
2. Open `src/index.html` in a web browser.
   * No server is required – it works with the `file://` protocol.
3. Use the arrow keys or swipe on touch devices to move and rotate pieces.
4. Press **Space** (or tap the screen) to hard‑drop.

## Development Notes
- The code is written in ES6 modules; browsers that do not support modules can be accommodated with a small bundler if needed.
- Unit tests are located in `tests/` and use Jest – run them with `npm test` (after installing dependencies).
- Styling uses CSS Grid for the game board and Flexbox for controls.

## Contributing
Feel free to open issues or pull requests.  Please keep changes focused on a single feature or bug fix, add tests where applicable, and follow the style guide in `doc/style-guide.md`.

---

### License
MIT © [Your Name]
