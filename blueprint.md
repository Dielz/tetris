# Tetris Blueprint

## Overview
This document outlines the high‑level architecture and key components required to build a browser‑based Tetris game using HTML5, CSS3, and vanilla JavaScript.

## Core Features
- Classic Tetris mechanics (piece rotation, line clearing, score tracking)
- Responsive canvas rendering
- Keyboard controls with debouncing
- Sound effects and optional music
- Game over and restart logic
- Optional: high‑score persistence via `localStorage`

## Architecture Diagram
```
+---------------------+
|  index.html         |
+---------------------+
|  style.css          |
+---------------------+
|  src/
|   ├─ game.js        |
|   ├─ renderer.js    |
|   ├─ input.js       |
|   └─ utils.js      |
+---------------------
```

## File Structure
- `index.html` – Entry point with a `<canvas>` element.
- `style.css` – Basic styling and responsive layout.
- `src/` – JavaScript modules:
  - `game.js` – Game loop, state machine, and logic.
  - `renderer.js` – Canvas drawing utilities.
  - `input.js` – Keyboard event handling.
  - `utils.js` – Helper functions (e.g., random piece generator).

## Development Workflow
1. Set up a local server (`npm install -g http-server` or use VS Code Live Server).
2. Implement core logic in `game.js`.
3. Render pieces via `renderer.js`.
4. Hook keyboard events from `input.js`.
5. Test, iterate, and polish UI/UX.

## Next Steps
- Add sound assets.
- Implement difficulty scaling.
- Write unit tests for game logic.
- Deploy to GitHub Pages or Netlify.
