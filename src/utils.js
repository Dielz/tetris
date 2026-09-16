export function rotate(matrix) {
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

export function collides(grid, piece, offsetX, offsetY) {
  const { rotations } = piece;
  const shape = rotations[piece.rotation % rotations.length];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const gx = x + offsetX;
      const gy = y + offsetY;
      if (gx < 0 || gx >= grid.width) return true;
      if (gy >= grid.height) return true;
      if (gy >= 0 && grid.cells[gy][gx]) return true;
    }
  }
  return false;
}

export function getRandomTetromino(tetrominoes) {
  const idx = Math.floor(Math.random() * tetrominoes.length);
  return { ...tetrominoes[idx], rotation: 0, x: 3, y: -2 };
}
