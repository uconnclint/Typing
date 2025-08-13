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

    // Background + header
    this.add.rectangle(0,0,width,height,0x0a0f18).setOrigin(0);
    this.add.rectangle(0,0,width,64,0x1f2640).setOrigin(0);

    // Lanes
    this.lanesY = [240, 340, 440];
    this.lanesY.forEach(y=>{
      this.add.rectangle(0, y, width, 6, 0x29344a).setOrigin(0,0.5);
      for (let i=0;i<width;i+=40) this.add.rectangle(i+20, y, 16, 3, 0x445273).setOrigin(0.5);
    });

    // Player starts middle lane
    this.playerX = 120;
    this.playerLane = 1;
    this.player = this.add.image(this.playerX, this.lanesY[this.playerLane], 'runner').setScale(2);

    // HUD
    this.timeText  = this.add.text(20,  20, 'TIME 0.0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.letText   = this.add.text(250, 20, 'LETTERS 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.scoreText = this.add.text(540, 20, 'SCORE 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.promptTxt = this.add.text(width/2, 92, 'TYPE THE GREEN LETTER', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0.5);

    // Mute (sync SFX + Phaser)
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });

    // On-screen keyboard
    this.kb = new OnScreenKeyboard(this, width - 340, height - 180);
    this.add.existing(this.kb);

    // Letters above lanes
    this.letterTexts = this.lanesY.map((y, i) => this.add.text(this.playerX + 260, y - 28, '', {
      fontFamily:'"Press Start 2P"', fontSize:'20px', color:'#ffffff'
    }).setOrigin(0.5));

    // Obstacles (still travel in two wrong lanes)
    this.obGroup = this.add.group();

    // Speed so obstacle arrival ~ reaction window
    const spawnX = width + 60;
    this.obSpeed = (spawnX - this.playerX) / this.reaction; // px/sec

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

      // GREEN is the only valid answer for this wave
      if (k !== this.greenLetter) {
        this._endGame('Wrong key!');
        return;
      }

      // Success: hop to the green lane, count, next wave
      this._goToLane(this.safeLane);
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
      // restart the current wave timer fresh
      this._startWaveTimer();
    }
  }

  _goToLane(laneIndex){
    this.playerLane = laneIndex;
    this.tweens.add({ targets: this.player, y: this.lanesY[this.playerLane], duration: 90, ease: 'Quad.easeOut' });
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
    // reset visuals + timers
    this._clearObstacles();
    this._clearWaveTimer();

    // Decide which lane is green
    this.safeLane = Phaser.Math.Between(0,2);

    // Pick letters: one green + two unique reds
    const pool = this.pool;
    this.greenLetter = Phaser.Utils.Array.GetRandom(pool);

    let red1, red2;
    do { red1 = Phaser.Utils.Array.GetRandom(pool); } while (red1 === this.greenLetter);
    do { red2 = Phaser.Utils.Array.GetRandom(pool); } while (red2 === this.greenLetter || red2 === red1);

    const lettersByLane = [];
    for (let l = 0; l < 3; l++) {
      if (l === this.safeLane) lettersByLane[l] = this.greenLetter;
      else lettersByLane[l] = (lettersByLane.includes(red1) ? red2 : red1);
    }

    // Update lane labels (color-coded)
    const GREEN = '#7CFFA1', RED = '#ff5566';
    this.letterTexts.forEach((txt, l) => {
      const isGreen = (l === this.safeLane);
      txt.setText(lettersByLane[l].toUpperCase());
      txt.setColor(isGreen ? GREEN : RED);
    });

    // Highlight the correct key on the on-screen keyboard
    this.kb.highlight(this.greenLetter);

    // Spawn obstacles in the two WRONG lanes
    const { width } = this.scale;
    [0,1,2].forEach(l => {
      if (l === this.safeLane) return;
      const ob = this.add.image(width + 60, this.lanesY[l], 'ob').setScale(2);
      this.obGroup.add(ob);
      this.tweens.add({
        targets: ob,
        x: this.playerX,
        duration: ((ob.x - this.playerX) / this.obSpeed) * 1000,
        ease: 'Linear',
        onComplete: () => {
          if (!this.gameOver && this.playerLane === l) {
            this._endGame('Collision!');
          } else {
            ob.destroy();
          }
        }
      });
    });

    // Start the reaction timer: no input in time => fail
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
