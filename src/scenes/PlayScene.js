import { GameConfig, CHARACTERS, getSelectedCharIndex, TRACKS, getSelectedTrackIndex } from '../config.js';
import { KEY_POOLS, normalizeKey, isAllowedChar, IGNORE_KEYS } from '../utils/keys.js';
import { SFX } from '../utils/audio.js';
import OnScreenKeyboard from '../ui/OnScreenKeyboard.js';

export default class PlayScene extends Phaser.Scene {
  constructor(){ super('play'); }

  preload(){
    if (!this.textures.exists('boy')) {
      this.load.image('boy', 'assets/boy.png');
    }
  }

  init(data){
    this.mode = data.mode || GameConfig.mode || 'mixed';
    this.difficulty = data.difficulty || GameConfig.difficulty || 'easy';
    this.pool = KEY_POOLS[this.mode] || KEY_POOLS.mixed;
// NEW (+2s buffer, and stash base)
    this.baseReaction = (GameConfig.times[this.difficulty] || 1.2) + 2;
    this.reaction = this.baseReaction;    
    this.rampEvery = 5;     // every 5 correct
    this.rampStep  = 0.20;  // shave off 0.20s each ramp
    this.minReaction = 0.80; // never go below 0.8s
    this.charId = data.charId || CHARACTERS[getSelectedCharIndex()].id || 'boy';
  }

  create(){
    const { width, height } = this.scale;

    // Ensure camera origin
    this.cameras.main.setScroll(0, 0);

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

    // Start selected background track in-game
    const trk = TRACKS[getSelectedTrackIndex()];
    if (trk) {
      if (this.music && this.music.isPlaying) this.music.stop();
      this.music = this.sound.get(trk.id) || this.sound.add(trk.id, { loop: true, volume: 0.25 });
      if (!this.music.isPlaying) this.music.play();
      this.sound.mute = (localStorage.getItem('kr_muted')==='1');
    }

    // On-screen keyboard FIRST (for layout)
    this.kb = new OnScreenKeyboard(this);
    this.add.existing(this.kb);
    const kbW = this.kb.totalWidth || 460;
    const kbH = this.kb.totalHeight || 140;
    const margin = 20;
    const avail = width - margin*2;
    const scale = Math.min(1, avail / kbW);
    if (typeof this.kb.setScale === 'function') this.kb.setScale(scale);
    else { this.kb.scaleX = scale; this.kb.scaleY = scale; }
    this.kb.x = Math.round((width - kbW * scale) / 2);
    this.kb.y = Math.round(height - (kbH * scale) - margin);

    // Layout Ys
    const labelY = 160;
    const guideStartY = labelY + 26;
    this.kbTopY  = this.kb.y;
    this.playerY = this.kbTopY - 80;
    this.spawnY  = -60;
    this.stopY   = this.kbTopY - 8;

    // Columns (x positions)
    const centerX = width / 2;
    const colOffset = 160;
    this.colsX = [centerX - colOffset, centerX, centerX + colOffset];

    // Column guides (down to keyboard top)
    this.colsX.forEach(x=>{
      const h = Math.max(0, this.kbTopY - guideStartY);
      this.add.rectangle(x, guideStartY, 4, h, 0x29344a).setOrigin(0.5,0);
    });

    // Player sprite (safe scaling)
    const playerTexture = (this.charId && this.textures.exists(this.charId)) ? this.charId : 'boy';
    this.playerCol = 1;
    this.player = this.add.image(this.colsX[this.playerCol], this.playerY, playerTexture).setOrigin(0.5,1);

    const tex = this.textures.get(playerTexture);
    const srcImg = tex && tex.getSourceImage ? tex.getSourceImage() : null;
    const baseH = Math.max(1,
      (this.player.height || 0),
      (srcImg && (srcImg.height || srcImg.naturalHeight || 0)) || 0
    );
    const targetH = 64;
    const s = Phaser.Math.Clamp(targetH / baseH, 0.25, 6);
    this.player.setScale(s);
    this.player.x = this.colsX[this.playerCol];
    this.player.y = this.playerY;

    // Column letters
    this.letterTexts = this.colsX.map(x => this.add.text(x, labelY, '', {
      fontFamily:'"Press Start 2P"', fontSize:'20px', color:'#ffffff'
    }).setOrigin(0.5));

    // Falling obstacles
    this.obGroup = this.add.group();
    this.activeObstacles = 0;
    this.settling = false;

    // Speed: time-to-player ~= reaction window
    this.dropSpeed = (this.playerY - this.spawnY) / this.reaction;

    // Stats
    this.lettersTyped = 0;
    this.startTime = this.time.now;
    this.gameOver = false;
    this.paused = false;

    // READY COUNTDOWN (3s)
    this.ready = false;
    this.countNum = 3;
    this.countText = this.add.text(width/2, this.playerY - 80, '3', {
      fontFamily:'"Press Start 2P"', fontSize:'48px', color:'#ffffff'
    }).setOrigin(0.5).setAlpha(0.95);

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        if (this.countNum > 1) {
          this.countNum--;
          this.countText.setText(String(this.countNum));
          SFX.tick();
        } else if (this.countNum === 1) {
          this.countNum = 0;
          this.countText.setText('GO!');
          SFX.ok();
        } else {
          this.countText.destroy();
          this.ready = true;
          this._nextWave();
        }
      }
    });

    // Input
    this.keyHandler = (e)=>{
      if (e.repeat) return;
      if (IGNORE_KEYS.has(e.key)) {
        if (e.key === 'Escape') this._togglePause();
        if (e.key === 'r' || e.key === 'R') this.scene.restart({mode:this.mode, difficulty:this.difficulty});
        return;
      }
      if (this.gameOver || this.paused || this.settling || !this.ready) return;

      const k = normalizeKey(e.key);
      if (!k || !isAllowedChar(k)) return;
      if (k !== this.greenLetter) { this._endGame('Wrong key!'); return; }

      // Correct: move to safe column, hide green label, let reds finish
      this._goToColumn(this.safeCol);
      this.lettersTyped++;
      this._clearWaveTimer();
      this.settling = true;
      this.letterTexts[this.safeCol].setText('');

      if (this.activeObstacles === 0) {
        this.settling = false;
        this._nextWave();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // ensure cleanup on scene stop/destroy
    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy',  () => this._cleanup());
  }

  _cleanup(){
    window.removeEventListener('keydown', this.keyHandler);
    this._clearWaveTimer();
    if (this.music && this.music.isPlaying) this.music.stop();
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
      if (this.pauseOverlay) this.pauseOverlay.destroy();
      if (this.pauseText) this.pauseText.destroy();
      if (!this.settling && this.ready) this._startWaveTimer();
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
    if (!this.ready) return;

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

    // Labels (green/red)
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
    if (this.gameOver || this.paused || !this.ready) return;
    const t = Math.max(0, (this.time.now - this.startTime)/1000);
    const score = Math.floor(t * this.lettersTyped);
    this.timeText.setText(`TIME ${t.toFixed(1)}`);
    this.letText.setText(`LETTERS ${this.lettersTyped}`);
    this.scoreText.setText(`SCORE ${score}`);
  }
}
