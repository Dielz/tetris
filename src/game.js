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
    this.state = 'menu';
    this.musicEnabled = true;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.clearingRows = [];
    this.clearFlashStart = 0;
    this.clearCount = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.levelUpStart = 0;
    this.musicTimer = null;
    this.musicGain = null;
    this.nextNoteTime = 0;
    this.musicStep = 0;
    this.initAudio();
    this.initInput();
    this.initCanvasInput();
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
    if (!this.audioCtx || !this.soundEnabled) return;
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

  playLineClearSound(cleared = 1) {
    const base = 660;
    const lines = Math.min(cleared, 4);
    // More lines: higher start note, more notes, louder and longer fanfare.
    const shift = 110 * lines; // 770, 880, 990, 1100
    const noteCount = lines + 1; // 2, 3, 4, 5 notes
    const volume = 0.1 + 0.03 * lines; // 0.13, 0.16, 0.19, 0.22
    const gap = 0.09 - 0.015 * lines; // faster arpeggio as lines increase
    const duration = 0.1 + 0.02 * lines;
    for (let i = 0; i < noteCount; i++) {
      const freq = base * Math.pow(2, i / 3) + shift * (i / noteCount);
      this.playTone(freq, duration, 'triangle', volume, gap * i);
    }
    // Extra low "boom" for bigger clears (3 and 4 lines).
    if (lines >= 3) {
      this.playTone(110, 0.3 + 0.1 * lines, 'sawtooth', 0.15, gap * noteCount);
    }
  }

  playGameOverSound() {
    this.playTone(400, 0.2, 'sawtooth', 0.12);
    this.playTone(300, 0.2, 'sawtooth', 0.12, 0.18);
    this.playTone(200, 0.3, 'sawtooth', 0.12, 0.36);
  }

  playLevelUpSound() {
    this.playTone(523, 0.12, 'triangle', 0.14);
    this.playTone(659, 0.12, 'triangle', 0.14, 0.1);
    this.playTone(784, 0.12, 'triangle', 0.14, 0.2);
    this.playTone(1047, 0.32, 'triangle', 0.17, 0.3);
  }

  startMusic() {
    if (!this.audioCtx || !this.musicEnabled || this.musicTimer) return;
    this.resumeAudio();
    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = 0.14;
    this.musicGain.connect(this.audioCtx.destination);
    this.nextNoteTime = this.audioCtx.currentTime + 0.1;
    this.musicStep = 0;
    this.scheduleMusicNotes();
    this.musicTimer = setInterval(() => this.scheduleMusicNotes(), 25);
  }

  scheduleMusicNotes() {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;
    const secondsPerStep = 60 / 145 / 2; // 8th notes at 145 BPM
    while (this.nextNoteTime < this.audioCtx.currentTime + 0.12) {
      this.playMusicStep(this.musicStep, this.nextNoteTime);
      this.nextNoteTime += secondsPerStep;
      this.musicStep = (this.musicStep + 1) % 32;
    }
  }

  playMusicStep(step, time) {
    const bassPattern = [
      110, 0, 110, 110, 0, 87, 0, 0,
      98, 0, 98, 98, 0, 82, 0, 0,
      110, 0, 110, 110, 0, 87, 0, 110,
      98, 0, 98, 110, 131, 0, 147, 0
    ];
    const melodyPattern = [
      220, 0, 261, 330, 261, 0, 220, 0,
      196, 0, 220, 261, 220, 0, 196, 0,
      174, 0, 220, 196, 220, 0, 261, 261,
      330, 0, 294, 330, 392, 0, 330, 294
    ];
    const bass = bassPattern[step % 32];
    const melody = melodyPattern[step % 32];
    if (bass) this.playMusicTone(bass, 0.22, time, 'triangle', 0.1);
    if (melody) this.playMusicTone(melody, 0.16, time, 'square', 0.05);
    if (step % 2 === 1) this.playMusicTone(2000, 0.03, time, 'square', 0.015);
  }

  playMusicTone(frequency, duration, time, type, volume) {
    if (!this.audioCtx || !this.musicGain || this.audioCtx.state !== 'running') return;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.musicGain);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.audioCtx && this.musicGain) {
      const now = this.audioCtx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    }
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  resetRound() {
    this.grid = createGrid();
    this.current = getRandomTetromino(TETROMINOES);
    this.next = getRandomTetromino(TETROMINOES);
    this.score = 0;
    this.level = 1;
    this.linesCleared = 0;
    this.dropInterval = 800;
    this.lastDrop = 0;
    this.gameOver = false;
    this.clearingRows = [];
    this.clearFlashStart = 0;
    this.clearCount = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.levelUpStart = 0;
  }

  startGame() {
    this.resetRound();
    this.state = 'playing';
    this.resumeAudio();
    this.startMusic();
  }

  restart() {
    this.startGame();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      if (this.audioCtx) this.audioCtx.suspend();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.lastDrop = performance.now();
      this.resumeAudio();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
  }

  initCanvasInput() {
    canvas.addEventListener('click', () => {
      if (this.state === 'menu') this.startGame();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'gameover') this.restart();
    });
  }

  initInput() {
    window.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'm' || k === 'M') { this.toggleMusic(); return; }
      if (k === 's' || k === 'S') { this.toggleSound(); return; }
      if (this.state === 'menu') {
        if (k === 'Enter' || k === ' ') { e.preventDefault(); this.startGame(); }
        return;
      }
      if (this.state === 'gameover') {
        if (k === 'r' || k === 'R' || k === 'Enter' || k === ' ') { e.preventDefault(); this.restart(); }
        return;
      }
      // playing or paused
      if (k === 'p' || k === 'P' || k === 'Escape') { this.togglePause(); return; }
      if (k === 'r' || k === 'R') { this.restart(); return; }
      if (this.state !== 'playing') return;
      if (this.clearingRows.length) return;
      switch (k) {
        case 'ArrowLeft': this.move(-1, 0); break;
        case 'ArrowRight': this.move(1, 0); break;
        case 'ArrowDown': this.drop(); break;
        case 'ArrowUp': this.rotatePiece(); break;
        case ' ': e.preventDefault(); this.hardDrop(); break;
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
      this.clearCount = fullRows.length;
      this.clearFlashStart = performance.now();
      // Screen shake scales with number of lines cleared.
      this.shakeTime = this.clearFlashStart;
      this.shakeDuration = 150 + this.clearCount * 70; // 220 / 290 / 360 / 430 ms
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
      this.playLineClearSound(cleared);
      if (this.linesCleared >= this.level * 10) {
        this.level++;
        this.dropInterval *= 0.9;
        this.levelUpStart = performance.now();
        this.playLevelUpSound();
      }
    }
    this.clearingRows = [];
    this.clearFlashStart = 0;
    this.clearCount = 0;
    this.spawnNextPiece();
  }

  spawnNextPiece() {
    this.current = this.next;
    this.next = getRandomTetromino(TETROMINOES);
    if (collides(this.grid, this.current, this.current.x, this.current.y)) {
      this.gameOver = true;
      this.state = 'gameover';
      this.stopMusic();
      this.playGameOverSound();
    }
  }

  loop(timestamp) {
    if (this.state === 'playing' && this.clearingRows.length) {
      // Lines are flashing: wait for the animation before destroying them.
      if (timestamp - this.clearFlashStart >= CLEAR_FLASH_DURATION) {
        this.finishLineClear();
      }
    } else if (this.state === 'playing' && !this.lastDrop) {
      this.lastDrop = timestamp;
    } else if (this.state === 'playing' && !this.gameOver) {
      const delta = timestamp - this.lastDrop;
      if (delta > this.dropInterval) {
        this.drop(true);
        this.lastDrop = timestamp;
      }
    }
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  draw(now = performance.now()) {
ctx.clearRect(0, 0, canvas.width, canvas.height);
     // Screen shake during line clears, scaled by the number of lines.
     let shakeX = 0;
     let shakeY = 0;
     if (now - this.shakeTime < this.shakeDuration) {
       const remaining = 1 - (now - this.shakeTime) / this.shakeDuration;
       const magnitude = (2 + this.clearCount * 1.5) * remaining;
       shakeX = (Math.random() * 2 - 1) * magnitude;
       shakeY = (Math.random() * 2 - 1) * magnitude;
     }
     ctx.save();
     ctx.translate(shakeX, shakeY);
     // Multi-line clear effect: flashing lines, shockwave, label and screen flash.
     if (this.clearingRows.length) {
       const elapsed = now - this.clearFlashStart;
       const progress = Math.min(elapsed / CLEAR_FLASH_DURATION, 1);
       const blink = (Math.sin(elapsed / 60) + 1) / 2; // oscillates 0..1
       for (const row of this.clearingRows) {
         for (let x = 0; x < this.grid.width; x++) {
           drawTile(x * CELL_SIZE, row * CELL_SIZE, '#ffffff', 0.4 + 0.6 * blink);
         }
       }
       if (this.clearCount >= 2) {
         const labels = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS!'];
         const label = labels[this.clearCount] || 'TETRIS!';
         const rowsCenter = this.clearingRows.reduce((a, r) => a + r, 0) / this.clearingRows.length;
         const originY = (rowsCenter + 0.5) * CELL_SIZE;
         // Expanding shockwaves from the cleared rows, one per line.
         for (let ring = 0; ring < this.clearCount; ring++) {
           const ringProg = Math.max(0, Math.min(1, progress * this.clearCount - ring * 0.18));
           const radius = 20 + ringProg * canvas.width * 0.7;
           ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - ringProg)})`;
           ctx.lineWidth = (2 + this.clearCount * 2) * (1 - ringProg);
           ctx.beginPath();
           ctx.arc(canvas.width / 2, originY, radius, 0, Math.PI * 2);
           ctx.stroke();
         }
         // Full-screen white flash for big clears.
         ctx.fillStyle = `rgba(255,255,255,${0.25 * (this.clearCount / 4) * (1 - progress)})`;
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         // Multi-line label.
         ctx.font = `bold ${26 + this.clearCount * 5}px Arial`;
         ctx.fillStyle = '#ffffff';
         ctx.textAlign = 'center';
         ctx.globalAlpha = 0.5 + 0.5 * blink;
         ctx.fillText(label, canvas.width / 2 - 60, originY - 14);
         ctx.globalAlpha = 1;
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
     if (this.state !== 'menu' && !this.gameOver && !this.clearingRows.length) {
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
     if (this.state !== 'menu' && !this.clearingRows.length) {
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
      ctx.restore();
     this.drawOverlay();
   }

   drawOverlay() {
     ctx.save();
     const cx = (this.grid.width * CELL_SIZE) / 2;
     ctx.textAlign = 'center';
     if (this.state === 'menu') {
       ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
       ctx.fillRect(0, 0, canvas.width, canvas.height);
       ctx.fillStyle = '#4ef';
       ctx.font = 'bold 52px Arial';
       ctx.fillText('TETRIS', cx, 170);
       ctx.fillStyle = '#fff';
       ctx.font = '20px Arial';
       ctx.fillText('Press SPACE to start', cx, 230);
       ctx.font = '15px Arial';
       ctx.fillText('Click to start', cx, 260);
       ctx.fillStyle = '#aaa';
       ctx.font = '13px Arial';
       ctx.fillText('M: Music  ' + (this.musicEnabled ? 'ON' : 'OFF'), cx, 300);
       ctx.fillText('S: Sound  ' + (this.soundEnabled ? 'ON' : 'OFF'), cx, 322);
     } else if (this.state === 'paused') {
       ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
       ctx.fillRect(0, 0, canvas.width, canvas.height);
       ctx.fillStyle = '#ff0';
       ctx.font = 'bold 44px Arial';
       ctx.fillText('PAUSED', cx, 200);
       ctx.fillStyle = '#fff';
       ctx.font = '17px Arial';
       ctx.fillText('Press P to resume', cx, 250);
       ctx.fillText('Press R to restart', cx, 276);
       ctx.fillStyle = '#aaa';
       ctx.font = '13px Arial';
       ctx.fillText('M: Music  ' + (this.musicEnabled ? 'ON' : 'OFF'), cx, 316);
       ctx.fillText('S: Sound  ' + (this.soundEnabled ? 'ON' : 'OFF'), cx, 338);
} else if (this.state === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 46px Arial';
        ctx.fillText('GAME OVER', cx, 160);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('Score: ' + this.score, cx, 220);
        ctx.fillText('Lines: ' + this.linesCleared, cx, 248);
        ctx.fillText('Level: ' + this.level, cx, 276);
        ctx.font = '17px Arial';
        ctx.fillText('Press R or SPACE to restart', cx, 330);
        ctx.fillStyle = '#aaa';
        ctx.font = '13px Arial';
        ctx.fillText('M: Music  ' + (this.musicEnabled ? 'ON' : 'OFF'), cx, 364);
        ctx.fillText('S: Sound  ' + (this.soundEnabled ? 'ON' : 'OFF'), cx, 386);
      }
      // Level-up celebration: expanding rings + banner.
      if (this.levelUpStart && this.state === 'playing') {
        const elapsed = performance.now() - this.levelUpStart;
        const DURATION = 1600;
        if (elapsed < DURATION) {
          const t = elapsed / DURATION;
          const pop = 1 + 0.45 * Math.sin(Math.min(t / 0.28, 1) * Math.PI); // scale bump
          const fadeIn = Math.min(1, t * 6);
          const fadeOut = 1 - Math.max(0, (t - 0.45) / 0.55);
          const alpha = fadeIn * fadeOut;
          // Expanding rings from the center of the play area.
          for (let i = 0; i < 2; i++) {
            const ringT = Math.max(0, Math.min(1, t * 2.5 - i * 0.5));
            ctx.strokeStyle = `rgba(255,215,0,${0.6 * (1 - ringT) * alpha})`;
            ctx.lineWidth = 4 * (1 - ringT) + 1;
            ctx.beginPath();
            ctx.arc(cx, canvas.height / 2, 20 + ringT * cx * 1.2, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Golden banner.
          ctx.fillStyle = `rgba(255,215,0,${alpha * 0.25})`;
          ctx.fillRect(0, 90, canvas.width, 90);
          ctx.fillStyle = `rgba(255,215,0,${alpha})`;
          ctx.font = `bold ${Math.round(30 + 26 * pop)}px Arial`;
          ctx.shadowColor = '#ff0';
          ctx.shadowBlur = 14;
          ctx.fillText('LEVEL UP!', cx, 140);
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.font = 'bold 17px Arial';
          ctx.fillText('Level ' + this.level, cx, 168);
        } else {
          this.levelUpStart = 0;
        }
      }
      ctx.restore();
    }
  }

new Game();


