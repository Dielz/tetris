import { createGrid, merge, clearLines } from './grid.js';
import { rotate, collides, getRandomTetromino } from './utils.js';
import { TETROMINOES } from './tetrominoes.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 30;
canvas.width = 16.67 * CELL_SIZE;
canvas.height = 20 * CELL_SIZE;

function drawTile(x, y, color, opacity = 1) {
  const borderWidth = 3;
  const gap = 2;
  const inset = gap / 2 + borderWidth / 2;
  const size = CELL_SIZE - gap - borderWidth;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, size, size, 4);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.65 * opacity;
  ctx.fill();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
  ctx.restore();
}
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

  getLandingY() {
    let landingY = this.current.y;
    while (!collides(this.grid, this.current, this.current.x, landingY + 1)) {
      landingY++;
    }
    return landingY;
  }

  hardDrop() {
    this.current.y = this.getLandingY();
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
     // Draw grid with thick black border
     for (let y = 0; y < this.grid.height; y++) {
       for (let x = 0; x < this.grid.width; x++) {
         if (this.grid.cells[y][x]) {
           ctx.fillStyle = 'rgba(45, 45, 45, 0.8)';
           ctx.beginPath();
           ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE);
           ctx.lineTo((x + 1) * CELL_SIZE, y * CELL_SIZE);
           ctx.lineTo((x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE);
           ctx.lineTo(x * CELL_SIZE, (y + 1) * CELL_SIZE);
           ctx.closePath();
           ctx.strokeStyle = 'rgba(60, 60, 60, 0.3)';
           ctx.lineWidth = 1;
           ctx.stroke();
           ctx.fill();
         }
       }
     }
     // Draw thick black border for each cell
     for (let y = 0; y < this.grid.height; y++) {
       for (let x = 0; x < this.grid.width; x++) {
         if (!this.grid.cells[y][x]) {
           ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
           ctx.lineWidth = 3;
           ctx.beginPath();
           ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE);
           ctx.lineTo((x + 1) * CELL_SIZE, y * CELL_SIZE);
           ctx.lineTo((x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE);
           ctx.lineTo(x * CELL_SIZE, (y + 1) * CELL_SIZE);
           ctx.closePath();
           ctx.stroke();
         }
       }
     }
     // Recompute the landing position every frame using the current rotation.
     if (!this.gameOver) {
       const landingY = this.getLandingY();
       const ghostShape = this.current.rotations[this.current.rotation % this.current.rotations.length];
       if (landingY > this.current.y) {
         for (let y = 0; y < ghostShape.length; y++) {
           for (let x = 0; x < ghostShape[y].length; x++) {
             if (ghostShape[y][x]) {
               drawTile(
                 (this.current.x + x) * CELL_SIZE,
                 (landingY + y) * CELL_SIZE,
                 this.current.color,
                 0.3
               );
             }
           }
         }
       }
     }
     // Active piece: rounded tiles with borders in the piece color.
     const shape = this.current.rotations[this.current.rotation % this.current.rotations.length];
     for (let y = 0; y < shape.length; y++) {
       for (let x = 0; x < shape[y].length; x++) {
         if (shape[y][x]) {
           drawTile(
             (this.current.x + x) * CELL_SIZE,
             (this.current.y + y) * CELL_SIZE,
             this.current.color
           );
         }
       }
     }

     // Next piece preview uses the same tile style.
     const nextShape = this.next.rotations[this.next.rotation % this.next.rotations.length];
     const previewX = 12 * CELL_SIZE;
     const previewY = 10;
     for (let y = 0; y < nextShape.length; y++) {
       for (let x = 0; x < nextShape[y].length; x++) {
         if (nextShape[y][x]) {
           drawTile(previewX + x * CELL_SIZE, previewY + y * CELL_SIZE, this.next.color);
         }
       }
     }
     // Draw score and time
     ctx.save();
     ctx.font = '16px Arial';
     ctx.fillStyle = '#fff';
     ctx.textAlign = 'left';
     ctx.fillText(`Score: ${this.score}`, previewX + 5, previewY + nextShape.length * CELL_SIZE + 20);
     ctx.fillText(`Level: ${this.level}`, previewX + 5, previewY + nextShape.length * CELL_SIZE + 40);
     
     // Controls legend
     ctx.font = '14px Arial';
     ctx.textAlign = 'left';
     ctx.fillText('Arrow Keys:', previewX + 5, previewY + nextShape.length * CELL_SIZE + 60);
     ctx.fillText('← → : Move', previewX + 5, previewY + nextShape.length * CELL_SIZE + 80);
     ctx.fillText('↓ : Soft Drop', previewX + 5, previewY + nextShape.length * CELL_SIZE + 100);
     ctx.fillText('↑ : Rotate', previewX + 5, previewY + nextShape.length * CELL_SIZE + 120);
     ctx.fillText('Space : Hard Drop', previewX + 5, previewY + nextShape.length * CELL_SIZE + 140);
     ctx.restore();
  }
}

new Game();


