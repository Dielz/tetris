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
    // Save current position before dropping
    const originalY = this.current.y;
    
    while (!collides(this.grid, this.current, this.current.x, this.current.y + 1)) {
      this.current.y += 1;
    }
    
    // Lock piece after full drop
    this.lockPiece();
    
    // Show visual feedback during hard drop (temporary overlay)
    if (!this.gameOver) {
      const tempY = originalY + 2; // Temporary position for visualization
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
      
      // Draw overlay over the area where piece will fall
      for (let y = this.current.y; y < this.current.y + this.current.height; y++) {
        for (let x = this.current.x; x < this.current.x + this.current.width; x++) {
          if (y >= 0 && y < this.grid.height && x >= 0 && x < this.grid.width) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE);
            ctx.lineTo((x + 1) * CELL_SIZE, y * CELL_SIZE);
            ctx.lineTo((x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE);
            ctx.lineTo(x * CELL_SIZE, (y + 1) * CELL_SIZE);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
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
     // Draw current piece
     const shape = this.current.rotations[this.current.rotation % this.current.rotations.length];
     for (let y = 0; y < shape.length; y++) {
       for (let x = 0; x < shape[y].length; x++) {
         if (shape[y][x]) {
           ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = this.current.color;
            ctx.beginPath();
            ctx.moveTo((this.current.x + x) * CELL_SIZE, (this.current.y + y) * CELL_SIZE);
            ctx.lineTo(((this.current.x + x) + 1) * CELL_SIZE, (this.current.y + y) * CELL_SIZE);
            ctx.lineTo(((this.current.x + x) + 1) * CELL_SIZE, ((this.current.y + y) + 1) * CELL_SIZE);
            ctx.lineTo((this.current.x + x) * CELL_SIZE, ((this.current.y + y) + 1) * CELL_SIZE);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1.0;
         }
       }
     }
     
     // Draw next piece preview (right side of canvas)
     const nextShape = this.next.rotations[this.next.rotation % this.next.rotations.length];
     const previewX = 12 * CELL_SIZE; // Position to the right of the board
     const previewY = 10;
     
     ctx.save();
     ctx.globalAlpha = 0.95;
     ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
     
     // Draw background of next piece preview
     for (let y = 0; y < nextShape.length; y++) {
       for (let x = 0; x < nextShape[y].length; x++) {
         if (nextShape[y][x]) {
           ctx.beginPath();
           ctx.moveTo((previewX + x * CELL_SIZE), (previewY + y * CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE + CELL_SIZE), (previewY + y * CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE + CELL_SIZE), (previewY + y * CELL_SIZE + CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE), (previewY + y * CELL_SIZE + CELL_SIZE));
           ctx.closePath();
           ctx.fill();
         }
       }
     }
     
     // Draw next piece with border
     for (let y = 0; y < nextShape.length; y++) {
       for (let x = 0; x < nextShape[y].length; x++) {
         if (nextShape[y][x]) {
           ctx.save();
           ctx.globalAlpha = 1.0;
           ctx.fillStyle = this.next.color;
           ctx.beginPath();
           ctx.moveTo((previewX + x * CELL_SIZE), (previewY + y * CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE + CELL_SIZE), (previewY + y * CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE + CELL_SIZE), (previewY + y * CELL_SIZE + CELL_SIZE));
           ctx.lineTo((previewX + x * CELL_SIZE), (previewY + y * CELL_SIZE + CELL_SIZE));
           ctx.closePath();
           ctx.fill();
           ctx.restore();
         }
       }
     }
     
     // Add thick black border around preview
     ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
     ctx.lineWidth = 3;
     ctx.beginPath();
     ctx.moveTo(previewX, previewY);
     ctx.lineTo(previewX + nextShape[0].length * CELL_SIZE, previewY);
     ctx.lineTo(previewX + nextShape[0].length * CELL_SIZE, previewY + nextShape.length * CELL_SIZE);
     ctx.lineTo(previewX, previewY + nextShape.length * CELL_SIZE);
     ctx.closePath();
     ctx.stroke();
     
     // === Score and Controls Label ===
     ctx.restore();
     
     // Draw score and time
     ctx.save();
     ctx.font = '16px Arial';
     ctx.fillStyle = '#fff';
     ctx.textAlign = 'left';
     ctx.fillText(`Score: ${this.score}`, 10, 20);
     ctx.fillText(`Level: ${this.level}`, 10, 40);
     
     // Controls legend
     ctx.font = '14px Arial';
     ctx.textAlign = 'left';
     ctx.fillText('Arrow Keys:', 10, 65);
     ctx.fillText('← → : Move', 10, 85);
     ctx.fillText('↓ : Soft Drop', 10, 105);
     ctx.fillText('↑ : Rotate', 10, 125);
     ctx.fillText('Space : Hard Drop', 10, 145);
  }
}

new Game();
