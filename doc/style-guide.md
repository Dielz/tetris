# Style Guide

## Naming conventions
- **Modules** – lower‑case, hyphen separated (`game.js`, `tetrominoes.js`).
- **Classes** – PascalCase (`Game`, `Tetromino`).
- **Functions / variables** – camelCase.
- **Constants** – UPPER_SNAKE_CASE.

## File layout
```
src/
 ├─ index.html
 ├─ styles.css
 ├─ game.js
 ├─ tetrominoes.js
 └─ utils.js
```

## Code style
- Use ES6 modules (`export` / `import`).
- No global variables – everything is encapsulated in modules or the `Game` class.
- Prefer `const` over `let` unless reassignment is required.
- Add JSDoc comments for public APIs.
