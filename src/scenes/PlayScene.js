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

    // 🔊/🔇 mute (sync SFX + music)
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');

    // On-screen keyboard FIRST (so we can place player above it)
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

    // Vertical columns (x positions) and player position (near bottom)
    const centerX = width / 2;
    const colOffset = 160; // spacing between columns
    this.colsX = [centerX - colOffset, centerX, centerX + colOffset];

    this.playerY = this.kb.y - 60; // sit above keyboard
    this.spawnY = -60;             // start falling from above the screen

    // Column guides
    this.colsX.forEach(x=>{
      // faint guide line
      this.add.rectangle(x, 140, 4, Math.max(0, this.playerY - 140), 0x29344a).setOrigin(0.5,0);
      // little ticks
      for (let y=160; y<this.playerY; y+=48) this.add.rectangle(x, y, 12, 3, 0x445273).setOrigin(0.5);
    });

    // Player starts center column
    this.playerCol = 1;
    this.player = this.add.image(this.colsX[this.playerCol], this.playerY, 'runner').setScale(2);

    // Column letters (at top)
    this.letterTexts = this.colsX.map(x => this.add.text(x, 160, '', {
      fontFamily:'"Press Start 2P"', fontSize:'20px', color:'#ffffff'
    }).setOrigin(0.5));

    // Group for falling obstacles (two wrong columns)
    this.obGroup = this.add.group();

    // Speed tuned so time-to-player ~= reaction window
    this.dropSpeed = (this.playerY - this.spawnY) / this.reaction; // px/sec

    // Stats
    this.lettersTyped = 0;
    this.startTime = this.time.now;
    this.gameOver = false;
    this.paused = false;

    // First wave
    this._nextWave();

    // Input handling
    this.keyHandler = (e)=>{
      if (this.gameOver || this.paused) return;
      if (e.repeat) return;
      if (IGNORE_KEYS.has(e.key)) {
        if (e.key === 'Escape') this._togglePause();
        if (e.key === 'r' || e.key === 'R') this.scene.restart({mode:this.mode, difficulty:this.difficulty});
        return;
      }
      const k = normalizeKey(e.key);
      if (!k || !isAllowedChar(k)) return;

      // Only the green letter is valid
      if (k !== this.greenLetter) { this._endGame('Wrong key!'); return; }

      // Success: hop to the green column, count, next wave
      this._goToColumn(this.safeCol);
      this.lettersTyped++;
      this._clearWaveTimer();
      SFX.ok();
      this._nextWave();
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
      this._startWaveTimer(); // restart timer fresh
    }
  }

  _goToColumn(colIndex){
    this.playerCol = colIndex;
    this.tweens.add({
      targets: this.player,
      x: this.colsX[this.playerCol],
      duration: 90,
      ease: 'Quad.easeOut'
    });
  }

  _clearObstacles(){
    this.obGroup.getChildren().forEach(o=> o.destroy());
    this.obGroup.clear(false, true);
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

    // Pick safe column and letters
    this.safeCol = Phaser.Math.Between(0,2);
    this.greenLetter = Phaser.Utils.Array.GetRandom(this.pool);

    // two distinct wrong letters
    const wrongs = Phaser.Utils.Array.Shuffle(this.pool.filter(ch => ch !== this.greenLetter)).slice(0,2);

    const lettersByCol = [];
    lettersByCol[this.safeCol] = this.greenLetter;
    let wi = 0;
    [0,1,2].forEach(c => { if (c !== this.safeCol) lettersByCol[c] = wrongs[wi++]; });

    // Paint column letters (color-coded)
    const GREEN = '#7CFFA1', RED = '#ff5566';
    this.letterTexts.forEach((txt, c) => {
      const isGreen = (c === this.safeCol);
      txt.setText(lettersByCol[c].toUpperCase());
      txt.setColor(isGreen ? GREEN : RED);
    });

    // Highlight correct key on on-screen keyboard
    this.kb.highlight(this.greenLetter);

    // Spawn falling obstacles in the two WRONG columns
    [0,1,2].forEach(c => {
      if (c === this.safeCol) return;
      const ob = this.add.image(this.colsX[c], this.spawnY, 'ob').setScale(2);
      this.obGroup.add(ob);
      this.tweens.add({
        targets: ob,
        y: this.playerY,
        duration: ((this.playerY - this.spawnY) / this.dropSpeed) * 1000,
        ease: 'Linear',
        onComplete: () => {
          if (!this.gameOver && this.playerCol === c) {
            this._endGame('Collision!');
          } else {
            ob.destroy();
          }
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
