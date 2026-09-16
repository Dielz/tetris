import { createGrid, merge, clearLines } from './grid.js';
import { rotate, collides, getRandomTetromino } from './utils.js';
import { TETROMINOES } from './tetrominoes.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 30;
canvas.width = 10 * CELL_SIZE;
canvas.height = 20 * CELL_SIZE;

class Game {
  constructor() {
    this.grid = createGrid();
    this.current = getRandomTetromino(TETROMINOES);
    this.next = getRandomTetromino(TETROMINOES);
    this.score = 0;
  this.scoreEl = document.getElementById('score');
  this.nextEl = document.getElementById('next');
    this.level = 1;
    this.linesCleared = 0;
    this.dropInterval = 800;
    this.lastDrop = 0;
    this.gameOver = false;
    this.initInput();
    requestAnimationFrame(this.loop.bind(this));
  }

  initInput() {
    window.addEventListener('keydown', e => {
      if (this.gameOver) return;
      switch (e.key) {
        case 'ArrowLeft': this.move(-1, 0); break;
        case 'ArrowRight': this.move(1, 0); break;
        case 'ArrowDown': this.drop(); break;
        case 'ArrowUp': this.rotatePiece(); break;
        case ' ': this.hardDrop(); break;
      }
    });
  }

  move(dx, dy) {
    if (!collides(this.grid, this.current, this.current.x + dx, this.current.y + dy)) {
      this.current.x += dx;
      this.current.y += dy;
    }
  }

  rotatePiece() {
    const newRot = (this.current.rotation + 1) % this.current.rotations.length;
    if (!collides(this.grid, { ...this.current, rotation: newRot }, this.current.x, this.current.y)) {
      this.current.rotation = newRot;
    }
  }

  drop() {
    if (!collides(this.grid, this.current, this.current.x, this.current.y + 1)) {
      this.current.y += 1;
    } else {
      this.lockPiece();
    }
  }

  hardDrop() {
    while (!collides(this.grid, this.current, this.current.x, this.current.y + 1)) {
      this.current.y += 1;
    }
    this.lockPiece();
  }

  lockPiece() {
    merge(this.grid, this.current);
    const cleared = clearLines(this.grid);
    if (cleared) {
      this.linesCleared += cleared;
      this.score += cleared * 100;
      if (this.linesCleared >= this.level * 10) {
        this.level++;
        this.dropInterval *= 0.9;
      }
    }
    this.current = this.next;
    this.next = getRandomTetromino(TETROMINOES);
    if (collides(this.grid, this.current, this.current.x, this.current.y)) {
      this.gameOver = true;
    }
  }

  loop(timestamp) {
    if (!this.lastDrop) this.lastDrop = timestamp;
    const delta = timestamp - this.lastDrop;
    if (delta > this.dropInterval) {
      this.drop();
      this.lastDrop = timestamp;
    }
    this.draw();
    if (!this.gameOver) requestAnimationFrame(this.loop.bind(this));
  }

  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw grid
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (this.grid.cells[y][x]) {
          ctx.fillStyle = '#ccc';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    // Draw current piece
    const shape = this.current.rotations[this.current.rotation % this.current.rotations.length];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          ctx.fillStyle = this.current.color;
          ctx.fillRect((this.current.x + x) * CELL_SIZE, (this.current.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }
}

new Game();
