# Algorithms

## Matrix‑rotation
The tetromino shapes are stored as 4×4 matrices (arrays of arrays). Rotating a shape clockwise is simply a matrix transpose followed by a row reverse.
```js
function rotate(matrix) {
  const size = matrix.length;
  const out = [];
  for (let i = 0; i < size; i++) {
    out[i] = [];
    for (let j = 0; j < size; j++) {
      out[i][j] = matrix[size - j - 1][i];
    }
  }
  return out;
}
```

## Collision detection
A collision occurs when any cell of the active tetromino would be outside the grid bounds or overlap an occupied cell in the play‑field.
```js
function collides(grid, piece, offsetX, offsetY) {
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      const gx = x + offsetX;
      const gy = y + offsetY;
      if (gx < 0 || gx >= grid.width || gy >= grid.height) return true;
      if (gy >= 0 && grid.cells[gy][gx]) return true;
    }
  }
  return false;
}
```

## Line clearing
After a piece locks, rows that are fully occupied are removed and new empty rows are added at the top. The score is updated based on the number of lines cleared.
```js
function clearLines(grid) {
  const full = [];
  grid.cells.forEach((row, i) => {
    if (row.every(cell => cell)) full.push(i);
  });
  full.reverse().forEach(idx => {
    grid.cells.splice(idx, 1);
    grid.cells.unshift(new Array(grid.width).fill(0));
  });
  return full.length;
}
```
