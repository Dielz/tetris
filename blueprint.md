# Tetris Game Blueprint

## Overview
This document outlines the architecture, components, and development plan for a browser‑based Tetris game written in HTML/CSS/JavaScript.

## Core Features
- Classic Tetris mechanics (tetrominoes, rotation, collision detection)
- Score system with level progression
- Responsive design for desktop and mobile
- Audio feedback for line clears and game over
- Optional high‑score persistence using `localStorage`

## File Structure
```
└─ src/
   ├─ index.html          # Entry point
   ├─ styles.css           # Layout & theming
   ├─ game.js              # Main game loop and logic
   ├─ tetrominoes.js       # Tetromino definitions
   ├─ utils.js             # Helper functions (e.g., matrix ops)
   └─ assets/
        └─ sounds/         # Sound effects
```

## Development Milestones
1. **Setup project skeleton** – Create `index.html`, link CSS & JS.
2. **Implement canvas rendering** – Draw grid and current tetromino.
3. **Add movement & rotation controls** – Keyboard event handling.
4. **Collision detection** – Prevent overlap with settled blocks.
5. **Line clearing logic** – Remove full rows, update score.
6. **Level progression** – Increase drop speed every X lines cleared.
7. **Responsive UI** – Adapt grid size to viewport.
8. **Audio integration** – Play sounds on events.
9. **Persist high scores** – Store and display top scores.
10. **Testing & polish** – Unit tests, edge cases, visual tweaks.

## Key Algorithms
- **Matrix rotation**: rotate a 2D array clockwise.
- **Collision check**: iterate over tetromino cells and verify bounds and occupancy.
- **Line clear**: filter rows that are not full, prepend empty rows to maintain grid height.

## Tools & Libraries
- Vanilla JS (ES6+)
- Optional testing with Jest or Mocha
- CSS Grid/Flexbox for layout

## Resources
- [Tetris Guideline](https://tetris.fandom.com/wiki/Tetris_Guidelines) – official shape definitions.
- MDN Canvas API docs.
- Audio files can be sourced from free sound libraries.
