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
    this.reaction = GameConfig.times[this.difficulty] || 1.2;
  }
  create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0a0f18).setOrigin(0);
    this.add.rectangle(0,0,width,64,0x1f2640).setOrigin(0);
    this.lanesY = [240, 340, 440];
    this.lanesY.forEach(y=>{
      this.add.rectangle(0, y, width, 6, 0x29344a).setOrigin(0,0.5);
      for (let i=0;i<width;i+=40) this.add.rectangle(i+20, y, 16, 3, 0x445273).setOrigin(0.5);
    });
    this.playerX = 120;
    this.playerLane = 1;
    this.player = this.add.image(this.playerX, this.lanesY[this.playerLane], 'runner').setScale(2);
    this.timeText = this.add.text(20, 20, 'TIME 0.0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.letText  = this.add.text(250, 20, 'LETTERS 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.scoreText= this.add.text(540, 20, 'SCORE 0', {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff'});
    this.pauseHint= this.add.text(20, 50, 'ESC: Pause  •  R: Restart', {fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#9db2d0'});
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => { SFX.setMuted(!SFX.muted); this.muteText.setText(SFX.muted?'🔇':'🔊'); });
    this.kb = new OnScreenKeyboard(this, width - 340, height - 180); this.add.existing(this.kb);
    this.obGroup = this.add.group();
    this.targetText = this.add.text(width/2, 120, '', {fontFamily:'"Press Start 2P"', fontSize:'28px', color:'#9bd0ff'}).setOrigin(0.5);
    const spawnX = width + 60;
    this.obSpeed = (spawnX - this.playerX) / this.reaction;
    this.lettersTyped = 0; this.startTime = this.time.now; this.gameOver = false; this.paused = false;
    this._nextWave();
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
      if (k !== this.currentTarget) { this._endGame('Wrong key!'); return; }
      this._goToLane(this.safeLane); this.lettersTyped++; SFX.ok(); this._nextWave();
    };
    window.addEventListener('keydown', this.keyHandler);
  }
  _togglePause(){
    if (this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.rectangle(this.scale.width/2, this.scale.height/2, 520, 200, 0x000000, 0.6);
      this.pauseText = this.add.text(this.scale.width/2, this.scale.height/2, 'PAUSED\nPress ESC to resume', {
        fontFamily:'"Press Start 2P"', fontSize:'18px', color:'#ffffff', align:'center'
      }).setOrigin(0.5);
    } else { this.pauseOverlay?.destroy(); this.pauseText?.destroy(); }
  }
  _goToLane(laneIndex){
    this.playerLane = laneIndex;
    this.tweens.add({ targets: this.player, y: this.lanesY[this.playerLane], duration: 90, ease: 'Quad.easeOut' });
  }
  _clearObstacles(){
    this.obGroup.getChildren().forEach(o=> o.destroy());
    this.obGroup.clear(false, true);
  }
  _nextWave(){
    this._clearObstacles();
    this.safeLane = Phaser.Math.Between(0,2);
    this.currentTarget = Phaser.Utils.Array.GetRandom(this.pool);
    this.targetText.setText(this.currentTarget.toUpperCase());
    this.kb.highlight(this.currentTarget);
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
          if (!this.gameOver && this.playerLane === l) { this._endGame('Collision!'); }
          else { ob.destroy(); }
        }
      });
    });
  }
  _endGame(reason){
    if (this.gameOver) return;
    this.gameOver = true; SFX.bad(); window.removeEventListener('keydown', this.keyHandler);
    const timeSec = Math.max(0, (this.time.now - this.startTime)/1000);
    const score = Math.floor(timeSec * this.lettersTyped);
    this.time.delayedCall(200, () => {
      this.scene.start('over', { time: timeSec, letters: this.lettersTyped, score,
        mode: this.mode, difficulty: this.difficulty, reason });
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
  shutdown(){ window.removeEventListener('keydown', this.keyHandler); }
}
