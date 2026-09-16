# Architecture

The game consists of a small set of ES‑modules that expose pure functions or simple classes.

```
src/
 ├─ index.html          # Entry point – sets up the canvas and starts the loop
 ├─ styles.css          # Layout, colours and responsive helpers
 ├─ game.js             # Main loop, state machine and rendering
 ├─ tetrominoes.js      # Tetromino shapes and rotation logic
 ├─ grid.js             # 10×20 matrix representing settled blocks
 └─ utils.js            # Helpers (matrix rotate, collision test, random generator)
```

* `game.js` owns the **Game** class that keeps a reference to the current tetromino, the play‑field and the score.
* `tetrominoes.js` exports a constant array of 7 tetrominos – each is an object with a colour and a set of 4×4 matrices for every rotation state.
* `grid.js` exposes functions to add a piece to the field, clear full rows and query emptiness.

The modules communicate through plain objects; no global variables are used except for the entry point.
