import { GameConfig, savePrefs, TRACKS, getSelectedTrackIndex, setSelectedTrackIndex } from '../config.js';
import { SFX } from '../utils/audio.js';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('menu'); }

  create(){
    const { width } = this.scale;
    this.add.rectangle(0,0,width,this.scale.height,0x0d1220).setOrigin(0);
    this.add.rectangle(0,0,width,140,0x1f2640).setOrigin(0);
    this.add.text(width/2, 70, 'KEY RUNNER', { fontFamily:'"Press Start 2P"', fontSize:'34px', color:'#e6f3ff' }).setOrigin(0.5);
    this.add.text(width/2, 150, 'Type the green letter before time runs out. Wrong key ends the run.', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9db2d0', align:'center'
    }).setOrigin(0.5);

    // Practice Mode
    const modes = ['home','top','bottom','mixed'];
    const y1 = 230;
    this.add.text(70, y1-32, 'Practice Mode', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    modes.forEach((m,i)=> this._button(70 + i*200, y1, 160, 44, m.toUpperCase(), () => {
      GameConfig.mode = m; SFX.tick(); this._refresh();
    }));

    // Difficulty
    const diffs = ['easy','medium','hard'];
    const y2 = 330;
    this.add.text(70, y2-32, 'Difficulty', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    diffs.forEach((d,i)=> this._button(70 + i*200, y2, 160, 44, d.toUpperCase(), () => {
      GameConfig.difficulty = d; SFX.tick(); this._refresh();
    }));

    // Music picker
    const y3 = 410;
    this.add.text(70, y3-32, 'Music', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.trackIndex = getSelectedTrackIndex();
    this._button(70, y3, 44, 44, '◀', () => this._changeTrack(-1));
    this._button(370, y3, 44, 44, '▶', () => this._changeTrack(+1));
this.trackLabel = this.add.text(130, y3+12, '', {
  fontFamily: '"Press Start 2P"',
  fontSize: '14px',
  color: '#9bd0ff',
  padding: { top: 6, bottom: 2 }   // ← stops the crop
}).setOrigin(0,0);

// optional (crisper + sometimes helps metrics):
this.trackLabel.setResolution(2);

    // Start
    this._button(width/2-120, 480, 240, 56, 'START', () => {
      savePrefs(); SFX.ok();
      this.scene.start('play', { mode: GameConfig.mode, difficulty: GameConfig.difficulty });
    });

    // 🔊/🔇 mute
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;                 // <-- music too
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });

    // Init UI + audio state
    this._refresh();
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
    this._changeTrack(0); // start selected track
  }

  _changeTrack(delta){
    this.trackIndex = (this.trackIndex + delta + TRACKS.length) % TRACKS.length;
    setSelectedTrackIndex(this.trackIndex);

    const meta = TRACKS[this.trackIndex];
    this.trackLabel.setText(meta.title.toUpperCase());

    if (this.music && this.music.isPlaying) this.music.stop();
    let snd = this.sound.get(meta.id);
    if (!snd) snd = this.sound.add(meta.id, { loop: true, volume: 0.25 });
    snd.play();
    this.music = snd;

    this.sound.mute = SFX.muted; // keep in sync with toggle
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
    this.sel = this.add.text(70, 560,
      `MODE: ${GameConfig.mode.toUpperCase()}    DIFFICULTY: ${GameConfig.difficulty.toUpperCase()}`,
      {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'}
    );
    if (this.trackLabel) this.trackLabel.setText(TRACKS[this.trackIndex].title.toUpperCase());
  }
}
