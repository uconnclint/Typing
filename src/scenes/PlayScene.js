import { GameConfig } from '../config.js';
import { KEY_POOLS, normalizeKey, isAllowedChar, IGNORE_KEYS } from '../utils/keys.js';
import { SFX } from '../utils/audio.js';
import OnScreenKeyboard from '../ui/OnScreenKeyboard.js';

export default class PlayScene extends Phaser.Scene {
  constructor(){ super('play'); }

  init(data){
    this.mode = data.mode || GameConfig.mode || 'mixed';
    this.difficulty = data.difficulty || GameConfig.difficulty || 'easy';
    this.pool = KEY_POOLS[this.mode] || KEY_POOLS.mixed;
    this.reaction = GameConfig.times[this.difficulty] || 1.2; // seconds
  }

  create(){
    const { width, height } = this.scale;

    // BG + header
    this.add.rectangle(0,0,width,height,0x0a0f18).setOrigin(0);
    this.add.rectangle(0,0,width,64,0x1f2640).setOrigin(0);
    this.timeText  = this.add.text(20,  20, 'TIME 0.0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.letText   = this.add.text(250, 20, 'LETTERS 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.scoreText = this.add.text(540, 20, 'SCORE 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.add.text(width/2, 92, 'TYPE THE GREEN LETTER', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0.5);

    // 🔊/🔇 mute
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');

    // On-screen keyboard FIRST (for layout)
    this.kb = new OnScreenKeyboard(this);
    this.add.existing(this.kb);
    const kbW = this.kb.totalWidth || 460;
    const kbH = this.kb.totalHeight || 140;
    const margin = 20;
    const avail = width - margin*2;
    const scale = Math.min(1, avail / kbW);
    if (typeof this.kb.setScale === 'function') { this.kb.setScale(scale); }
    else { this.kb.scaleX = scale; this.kb.scaleY = scale; }
    this.kb.x = Math.round((width - kbW * scale) / 2);
    this.kb.y = Math.round(height - (kbH * scale) - margin);

    // Useful layout Ys
    this.kbTopY  = this.kb.y;          // top edge of the keyboard
    this.playerY = this.kbTopY - 60;   // runner sits above keyboard
    this.spawnY  = -60;                // letters start above screen
    this.stopY   = this.kbTopY - 8;    // reds stop just before keyboard and vanish

    // Columns (x positions)
    const centerX = width / 2;
    const colOffset = 160;
    this.colsX = [centerX - colOffset, centerX, centerX + colOffset];

  // === Column guides (no line behind the letter labels) ===
const labelY = 160;                  // where the letters sit
const gapBelowLabel = 26;            // leave space under the letter
const guideStartY = labelY + gapBelowLabel;

this.colsX.forEach(x=>{
  const h = Math.max(0, this.kbTopY - guideStartY);
  this.add.rectangle(x, guideStartY, 4, h, 0x29344a).setOrigin(0.5,0);
});

// (and make sure your labels use the same Y)
this.letterTexts = this.colsX.map(x => this.add.text(x, labelY, '', {
  fontFamily:'"Press Start 2P"', fontSize:'20px', color:'#ffffff'
}).setOrigin(0.5));
    // Player
    this.playerCol = 1;
    this.player = this.add.image(this.colsX[this.playerCol], this.playerY, 'runner').setScale(2);

    // Column letters at top
    this.letterTexts = this.colsX.map(x => this.add.text(x, 160, '', {
      fontFamily:'"Press Start 2P"', fontSize:'20px', color:'#ffffff'
    }).setOrigin(0.5));

    // Falling obstacles
    this.obGroup = this.add.group();
    this.activeObstacles = 0; // for settling after correct press
    this.settling = false;

    // Speed so time-to-player ~= reaction window
    this.dropSpeed = (this.playerY - this.spawnY) / this.reaction; // px/sec

    // Stats
    this.lettersTyped = 0;
    this.startTime = this.time.now;
    this.gameOver = false;
    this.paused = false;

    // First wave
    this._nextWave();

    // Input
    this.keyHandler = (e)=>{
      if (e.repeat) return;
      if (IGNORE_KEYS.has(e.key)) {
        if (e.key === 'Escape') this._togglePause();
        if (e.key === 'r' || e.key === 'R') this.scene.restart({mode:this.mode, difficulty:this.difficulty});
        return;
      }
      if (this.gameOver || this.paused || this.settling) return;

      const k = normalizeKey(e.key);
      if (!k || !isAllowedChar(k)) return;

      if (k !== this.greenLetter) { this._endGame('Wrong key!'); return; }

      // Correct: move to safe column, hide green, let reds finish to keyboard then vanish
      this._goToColumn(this.safeCol);
      this.lettersTyped++;
      this._clearWaveTimer();
      this.settling = true;
      this.letterTexts[this.safeCol].setText(''); // hide green
      SFX.ok();

      if (this.activeObstacles === 0) { // safety
        this.settling = false;
        this._nextWave();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  _togglePause(){
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this._clearWaveTimer();
      this.pauseOverlay = this.add.rectangle(this.scale.width/2, this.scale.height/2, 520, 200, 0x000000, 0.6);
      this.pauseText = this.add.text(this.scale.width/2, this.scale.height/2, 'PAUSED\nPress ESC to resume', {
        fontFamily:'"Press Start 2P"', fontSize:'18px', color:'#ffffff', align:'center'
      }).setOrigin(0.5);
    } else {
      this.pauseOverlay?.destroy(); this.pauseText?.destroy();
      if (!this.settling) this._startWaveTimer();
    }
  }

  _goToColumn(colIndex){
    this.playerCol = colIndex;
    this.tweens.add({ targets: this.player, x: this.colsX[this.playerCol], duration: 90, ease: 'Quad.easeOut' });
  }

  _clearObstacles(){
    this.obGroup.getChildren().forEach(o=> o.destroy());
    this.obGroup.clear(false, true);
    this.activeObstacles = 0;
  }

  _clearWaveTimer(){
    if (this.waveTimer) { this.waveTimer.remove(); this.waveTimer = null; }
  }

  _startWaveTimer(){
    this._clearWaveTimer();
    this.waveTimer = this.time.delayedCall(this.reaction * 1000, () => {
      if (!this.gameOver && !this.paused) this._endGame('Too slow!');
    });
  }

  _nextWave(){
    this._clearObstacles();
    this._clearWaveTimer();
    this.settling = false;

    // Pick safe column + letters
    this.safeCol = Phaser.Math.Between(0,2);
    this.greenLetter = Phaser.Utils.Array.GetRandom(this.pool);

    const wrongs = Phaser.Utils.Array.Shuffle(this.pool.filter(ch => ch !== this.greenLetter)).slice(0,2);
    const lettersByCol = [];
    lettersByCol[this.safeCol] = this.greenLetter;
    let wi = 0; [0,1,2].forEach(c => { if (c !== this.safeCol) lettersByCol[c] = wrongs[wi++]; });

    // Paint letters (green/red)
    const GREEN = '#7CFFA1', RED = '#ff5566';
    this.letterTexts.forEach((txt, c) => {
      const isGreen = (c === this.safeCol);
      txt.setText(lettersByCol[c].toUpperCase());
      txt.setColor(isGreen ? GREEN : RED);
    });

    // Highlight correct key
    this.kb.highlight(this.greenLetter);

    // Durations
    const toPlayerDur = ((this.playerY - this.spawnY) / this.dropSpeed) * 1000;
    const toStopDur   = ((this.stopY   - this.playerY) / this.dropSpeed) * 1000;

    // Spawn falling obstacles in WRONG columns; continue to keyboard then vanish
    [0,1,2].forEach(c => {
      if (c === this.safeCol) return;
      const ob = this.add.image(this.colsX[c], this.spawnY, 'ob').setScale(2);
      this.obGroup.add(ob);
      this.activeObstacles++;

      // 1) Fall to player line, check collision
      this.tweens.add({
        targets: ob,
        y: this.playerY,
        duration: toPlayerDur,
        ease: 'Linear',
        onComplete: () => {
          if (!this.gameOver && this.playerCol === c) {
            this._endGame('Collision!');
            return;
          }
          // 2) Continue to just above the keyboard, then disappear
          this.tweens.add({
            targets: ob,
            y: this.stopY,
            duration: toStopDur,
            ease: 'Linear',
            onComplete: () => {
              ob.destroy();
              this.activeObstacles--;
              if (this.settling && this.activeObstacles === 0) {
                this.settling = false;
                this._nextWave();
              }
            }
          });
        }
      });
    });

    // Start reaction timer (no input in time => fail)
    this._startWaveTimer();
  }

  _endGame(reason){
    if (this.gameOver) return;
    this.gameOver = true;
    this._clearWaveTimer();
    SFX.bad();
    window.removeEventListener('keydown', this.keyHandler);

    const timeSec = Math.max(0, (this.time.now - this.startTime)/1000);
    const score = Math.floor(timeSec * this.lettersTyped);

    this.time.delayedCall(200, () => {
      this.scene.start('over', {
        time: timeSec,
        letters: this.lettersTyped,
        score,
        mode: this.mode,
        difficulty: this.difficulty,
        reason
      });
    });
  }

  update(){
    if (this.gameOver || this.paused) return;
    const t = Math.max(0, (this.time.now - this.startTime)/1000);
    const score = Math.floor(t * this.lettersTyped);
    this.timeText.setText(`TIME ${t.toFixed(1)}`);
    this.letText.setText(`LETTERS ${this.lettersTyped}`);
    this.scoreText.setText(`SCORE ${score}`);
  }

  shutdown(){ window.removeEventListener('keydown', this.keyHandler); this._clearWaveTimer(); }
}
