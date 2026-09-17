import { createGrid, merge, clearLines } from './grid.js';
import { rotate, collides, getRandomTetromino } from './utils.js';
import { TETROMINOES } from './tetrominoes.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 30;
canvas.width = 16.67 * CELL_SIZE;
canvas.height = 20 * CELL_SIZE;
const CLEAR_FLASH_DURATION = 320;

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
    this.audioCtx = null;
    this.clearingRows = [];
    this.clearFlashStart = 0;
    this.initAudio();
    this.initInput();
    requestAnimationFrame(this.loop.bind(this));
  }

  initAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.15, delay = 0) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const startTime = this.audioCtx.currentTime + delay;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  playMoveSound() {
    this.playTone(300, 0.06, 'square', 0.06);
  }

  playRotateSound() {
    this.playTone(520, 0.09, 'triangle', 0.12);
    this.playTone(780, 0.09, 'triangle', 0.08, 0.06);
  }

  playDropSound() {
    this.playTone(220, 0.07, 'square', 0.08);
  }

  playHardDropSound() {
    this.playTone(180, 0.1, 'sawtooth', 0.12);
    this.playTone(120, 0.12, 'square', 0.1, 0.08);
  }

  playLineClearSound() {
    this.playTone(660, 0.12, 'triangle', 0.14);
    this.playTone(880, 0.12, 'triangle', 0.14, 0.09);
    this.playTone(1100, 0.16, 'triangle', 0.12, 0.18);
  }

  playGameOverSound() {
    this.playTone(400, 0.2, 'sawtooth', 0.12);
    this.playTone(300, 0.2, 'sawtooth', 0.12, 0.18);
    this.playTone(200, 0.3, 'sawtooth', 0.12, 0.36);
  }

  initInput() {
    window.addEventListener('keydown', e => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
      if (this.gameOver || this.clearingRows.length) return;
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
      if (dx !== 0) this.playMoveSound();
    }
  }

   rotatePiece() {
     const newRot = (this.current.rotation + 1) % this.current.rotations.length;
     if (!collides(this.grid, { ...this.current, rotation: newRot }, this.current.x, this.current.y)) {
       this.current.rotation = newRot;
       this.playRotateSound();
     }
   }

  drop(silent = false) {
    if (!collides(this.grid, this.current, this.current.x, this.current.y + 1)) {
      this.current.y += 1;
      if (!silent) this.playDropSound();
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
    this.playHardDropSound();
    this.lockPiece();
  }
  lockPiece() {
    merge(this.grid, this.current);
    // Detect full rows to animate before destroying them.
    const fullRows = [];
    for (let y = 0; y < this.grid.height; y++) {
      if (this.grid.cells[y].every(cell => cell)) fullRows.push(y);
    }
    if (fullRows.length) {
      this.clearingRows = fullRows;
      this.clearFlashStart = performance.now();
      this.playHardDropSound();
      return;
    }
    this.spawnNextPiece();
  }

  finishLineClear() {
    const cleared = clearLines(this.grid);
    if (cleared) {
      this.linesCleared += cleared;
      this.score += cleared * 100;
      this.playLineClearSound();
      if (this.linesCleared >= this.level * 10) {
        this.level++;
        this.dropInterval *= 0.9;
      }
    }
    this.clearingRows = [];
    this.clearFlashStart = 0;
    this.spawnNextPiece();
  }

  spawnNextPiece() {
    this.current = this.next;
    this.next = getRandomTetromino(TETROMINOES);
    if (collides(this.grid, this.current, this.current.x, this.current.y)) {
      this.gameOver = true;
      this.playGameOverSound();
    }
  }

  loop(timestamp) {
    // If lines are flashing, wait for the animation to finish before clearing them.
    if (this.clearingRows.length) {
      if (timestamp - this.clearFlashStart >= CLEAR_FLASH_DURATION) {
        this.finishLineClear();
      }
    } else if (!this.lastDrop) {
      this.lastDrop = timestamp;
    } else if (!this.gameOver) {
      const delta = timestamp - this.lastDrop;
      if (delta > this.dropInterval) {
        this.drop(true);
        this.lastDrop = timestamp;
      }
    }
    this.draw();
    if (!this.gameOver) requestAnimationFrame(this.loop.bind(this));
  }

  draw(now = performance.now()) {
ctx.clearRect(0, 0, canvas.width, canvas.height);
     // Flashing effect for completed lines before they are destroyed.
     if (this.clearingRows.length) {
       const elapsed = now - this.clearFlashStart;
       const blink = (Math.sin(elapsed / 60) + 1) / 2; // oscillates 0..1
       for (const row of this.clearingRows) {
         for (let x = 0; x < this.grid.width; x++) {
           drawTile(x * CELL_SIZE, row * CELL_SIZE, '#ffffff', 0.4 + 0.6 * blink);
         }
       }
     }
     // Draw grid with thick black border
     for (let y = 0; y < this.grid.height; y++) {
       for (let x = 0; x < this.grid.width; x++) {
         if (this.grid.cells[y][x]) {
            // Draw filled cell with rounded borders like a tetromino piece
            if (this.grid.cells[y][x]) {
              const color = '#808080'
              drawTile(x * CELL_SIZE, y * CELL_SIZE, color, 1.0);
            }
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
     if (!this.gameOver && !this.clearingRows.length) {
       const landingY = this.getLandingY();
       const ghostShape = this.current.rotations[this.current.rotation % this.current.rotations.length];
       if (landingY > this.current.y) {
         for (let y = 0; y < ghostShape.length; y++) {
           for (let x = 0; x < ghostShape[y].length; x++) {
             if (ghostShape[y][x]) {
            // Draw ghost piece with solid silhouette of current piece
            drawTile(
              (this.current.x + x) * CELL_SIZE,
              (landingY + y) * CELL_SIZE,
              this.current.color,
              0.5
            );
          }
           }
         }
       }
     }
     // Active piece: rounded tiles with borders in the piece color.
     if (!this.clearingRows.length) {
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
     ctx.fillText('Arrow Keys:', previewX + 5, previewY + nextShape.length * CELL_SIZE + 80);
     ctx.fillText('← → : Move', previewX + 5, previewY + nextShape.length * CELL_SIZE + 100);
     ctx.fillText('↓ : Soft Drop', previewX + 5, previewY + nextShape.length * CELL_SIZE + 120);
     ctx.fillText('↑ : Rotate', previewX + 5, previewY + nextShape.length * CELL_SIZE + 140);
     ctx.fillText('Space : Hard Drop', previewX + 5, previewY + nextShape.length * CELL_SIZE + 160);
     ctx.restore();
  }
}

new Game();


