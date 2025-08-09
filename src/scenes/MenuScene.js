import { GameConfig, savePrefs } from '../config.js';
import { SFX } from '../utils/audio.js';
export default class MenuScene extends Phaser.Scene {
  constructor(){ super('menu'); }
  create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);
    this.add.rectangle(0,0,width,140,0x1f2640).setOrigin(0);
    this.add.text(width/2, 70, 'KEY RUNNER', {
      fontFamily:'"Press Start 2P"', fontSize:'34px', color:'#e6f3ff'
    }).setOrigin(0.5);
    const how = 'Type the shown key to switch lanes. Wrong key = instant game over.';
    this.add.text(width/2, 150, how, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9db2d0', align:'center'
    }).setOrigin(0.5);
    const modes = ['home','top','bottom','mixed'];
    const diffs = ['easy','medium','hard'];
    const y1 = 230;
    this.add.text(70, y1-32, 'Practice Mode', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    modes.forEach((m,i)=> this._button(70 + i*200, y1, 160, 44, m.toUpperCase(), () => {
      GameConfig.mode = m; SFX.tick(); this._refresh();
    }));
    const y2 = 330;
    this.add.text(70, y2-32, 'Difficulty', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    diffs.forEach((d,i)=> this._button(70 + i*200, y2, 160, 44, d.toUpperCase(), () => {
      GameConfig.difficulty = d; SFX.tick(); this._refresh();
    }));
    this._button(width/2-120, 430, 240, 56, 'START', () => {
      savePrefs(); SFX.ok();
      this.scene.start('play', { mode: GameConfig.mode, difficulty: GameConfig.difficulty });
    });
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.muteText.setText(SFX.muted?'🔇':'🔊');
      });
    this._refresh();
    const bgm = this.sound.get('bgm') || this.sound.add('bgm', { loop: true, volume: 0.25 });
if (!bgm.isPlaying) bgm.play();
this.sound.mute = (localStorage.getItem('kr_muted') === '1'); // keep mute in sync
  }
  _button(x,y,w,h,label,cb){
    const bg = this.add.rectangle(x,y,w,h,0x2a334d).setOrigin(0);
    const txt = this.add.text(x+w/2, y+h/2, label, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#e6f3ff'
    }).setOrigin(0.5);
    bg.setInteractive({useHandCursor:true})
      .on('pointerover', ()=> bg.setFillStyle(0x344062))
      .on('pointerout',  ()=> bg.setFillStyle(0x2a334d))
      .on('pointerdown', cb);
    return {bg, txt};
  }
  _refresh(){
    if (this.sel) this.sel.destroy(true);
    this.sel = this.add.text(70, 520,
      `MODE: ${GameConfig.mode.toUpperCase()}    DIFFICULTY: ${GameConfig.difficulty.toUpperCase()}`,
      {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'}
    );
  }
}
