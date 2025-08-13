import { SFX } from '../utils/audio.js';

export default class OverScene extends Phaser.Scene {
  constructor(){ super('over'); }
  init(data){ this.dataObj = data; }

  create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);
    this.add.text(width/2, 90, 'GAME OVER', {fontFamily:'"Press Start 2P"', fontSize:'32px', color:'#ffb3c1'}).setOrigin(0.5);

    const { time, letters, score, mode, difficulty, reason } = this.dataObj;
    this.add.text(width/2, 160, reason.toUpperCase(), {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#f8d7da'}).setOrigin(0.5);

    const lines = [
      `TIME SURVIVED: ${time.toFixed(1)}s`,
      `LETTERS TYPED: ${letters}`,
      `TOTAL SCORE: ${score}`,
      `MODE: ${mode.toUpperCase()}    DIFFICULTY: ${difficulty.toUpperCase()}`
    ];
    this.add.text(width/2, 230, lines.join('\n'), {
      fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff', align:'center', lineSpacing:10
    }).setOrigin(0.5);

    this._button(width/2-220, 420, 200, 54, 'RESTART', () => this.scene.start('menu'));
    this._button(width/2+20, 420, 200, 54, 'MENU', () => this.scene.start('menu'));

    // 🔊/🔇 mute
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
  }

  _button(x,y,w,h,label,cb){
    const bg = this.add.rectangle(x,y,w,h,0x2a334d).setOrigin(0);
    const txt = this.add.text(x+w/2, y+h/2, label, { fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#e6f3ff' }).setOrigin(0.5);
    bg.setInteractive({useHandCursor:true})
      .on('pointerover', ()=> bg.setFillStyle(0x344062))
      .on('pointerout',  ()=> bg.setFillStyle(0x2a334d))
      .on('pointerdown', cb);
    return {bg, txt};
  }
}
