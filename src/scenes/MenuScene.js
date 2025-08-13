import { GameConfig, savePrefs, TRACKS, getSelectedTrackIndex, setSelectedTrackIndex } from '../config.js';
import { SFX } from '../utils/audio.js';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('menu'); }

  create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);
    this.add.rectangle(0,0,width,140,0x1f2640).setOrigin(0);
    this.add.text(width/2, 70, 'KEY RUNNER', { fontFamily:'"Press Start 2P"', fontSize:'34px', color:'#e6f3ff' }).setOrigin(0.5);
    this.add.text(width/2, 150, 'Type the shown key to switch lanes. Wrong key = instant game over.', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9db2d0', align:'center'
    }).setOrigin(0.5);

    // Mode buttons
    const modes = ['home','top','bottom','mixed'];
    const y1 = 230;
    this.add.text(70, y1-32, 'Practice Mode', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    modes.forEach((m,i)=> this._button(70 + i*200, y1, 160, 44, m.toUpperCase(), () => {
      GameConfig.mode = m; SFX.tick(); this._refresh();
    }));

    // Difficulty buttons
    const diffs = ['easy','medium','hard'];
    const y2 = 330;
    this.add.text(70, y2-32, 'Difficulty', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    diffs.forEach((d,i)=> this._button(70 + i*200, y2, 160, 44, d.toUpperCase(), () => {
      GameConfig.difficulty = d; SFX.tick(); this._refresh();
    }));

    // 🎵 Music picker
    const y3 = 410;
    this.add.text(70, y3-32, 'Music', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.trackIndex = getSelectedTrackIndex();

    const prev = this._button(70, y3, 44, 44, '◀', () => { this._changeTrack(-1); });
    const next = this._button(70+300, y3, 44, 44, '▶', () => { this._changeTrack(+1); });
    this.trackLabel = this.add.text(70+60, y3+10, '', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0,0);

    // Start
    this._button(width/2-120, 480, 240, 56, 'START', () => {
      savePrefs(); SFX.ok();
      this.scene.start('play', { mode: GameConfig.mode, difficulty: GameConfig.difficulty });
    });

    // 🔊/🔇 mute (persists + syncs Phaser audio)
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });

    // init UI + start music for current selection
    this._refresh();
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');
    this._changeTrack(0); // play currently selected track

    // stop music dupes on hot-reenter
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      // keep music running into Play; nothing to clean here
    });
  }

  _changeTrack(delta){
    // update index (wrap)
    this.trackIndex = (this.trackIndex + delta + TRACKS.length) % TRACKS.length;
    setSelectedTrackIndex(this.trackIndex);

    // update label
    this.trackLabel.setText(TRACKS[this.trackIndex].title.toUpperCase());

    // stop previous & play new
    if (this.music && this.music.isPlaying) this.music.stop();
    const key = TRACKS[this.trackIndex].id;
    let snd = this.sound.get(key);
    if (!snd) snd = this.sound.add(key, { loop: true, volume: 0.25 });
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
    // track label may not exist the first time create() runs
    if (this.trackLabel) this.trackLabel.setText(TRACKS[this.trackIndex].title.toUpperCase());
  }
}
