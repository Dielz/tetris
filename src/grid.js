export function createGrid(width = 10, height = 20) {
  const cells = Array.from({ length: height }, () => Array(width).fill(0));
  return { width, height, cells };
}

// Merge a piece into the grid when it locks.
export function merge(grid, piece) {
  const shape = piece.rotations[piece.rotation % piece.rotations.length];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gx = x + piece.x;
      const gy = y + piece.y;
      if (gy >= 0 && gy < grid.height && gx >= 0 && gx < grid.width) {
        grid.cells[gy][gx] = shape[y][x];
      }
    }
  }
}

// Remove full rows and return number of cleared lines.
export function clearLines(grid) {
  let cleared = 0;
  for (let y = grid.height - 1; y >= 0; y--) {
    if (grid.cells[y].every(cell => cell)) {
      grid.cells.splice(y, 1);
      grid.cells.unshift(Array(grid.width).fill(0));
      cleared++;
      y++; // recheck same row index after shift
    }
  }
  return cleared;
}
