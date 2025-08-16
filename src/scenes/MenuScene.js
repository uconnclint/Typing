import {
  GameConfig, savePrefs,
  TRACKS, getSelectedTrackIndex, setSelectedTrackIndex,
  CHARACTERS, getSelectedCharIndex, setSelectedCharIndex,
  REMOTE_LB_URL
} from '../config.js';
import { SFX } from '../utils/audio.js';

export default class MenuScene extends Phaser.Scene {
  constructor(){ super('menu'); }

  create(){
    const { width, height } = this.scale;

    // Background + header
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);
    this.add.rectangle(0,0,width,140,0x1f2640).setOrigin(0);
    this.add.text(width/2, 70, 'KEY RUNNER', {
      fontFamily:'"Press Start 2P"', fontSize:'34px', color:'#e6f3ff'
    }).setOrigin(0.5);
    this.add.text(width/2, 150, 'Type the green letter before time runs out. Wrong key ends the run.', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9db2d0', align:'center'
    }).setOrigin(0.5);

    // ---- Leaderboard (top-right) ----
    this.add.text(width - 220, 150, 'CLASS TOP 10', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff', padding:{top:6}
    }).setOrigin(0.5,0);

    this.lbText = this.add.text(width - 220, 178, 'Loading…', {
      fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#e6f3ff',
      align:'left', lineSpacing:6
    }).setOrigin(0.5,0);

    this._loadLeaderboard();  // kicks off fetch + auto-refresh
    // --------------------------------

    // Mode picker
    const modes = ['home','top','bottom','mixed'];
    const y1 = 230;
    this.add.text(70, y1-32, 'Practice Mode', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    modes.forEach((m,i)=> this._button(70 + i*200, y1, 160, 44, m.toUpperCase(), () => {
      GameConfig.mode = m; SFX.tick(); this._refresh();
    }));

    // Difficulty picker
    const diffs = ['easy','medium','hard'];
    const y2 = 330;
    this.add.text(70, y2-32, 'Difficulty', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    diffs.forEach((d,i)=> this._button(70 + i*200, y2, 160, 44, d.toUpperCase(), () => {
      GameConfig.difficulty = d; SFX.tick(); this._refresh();
    }));

    // Character picker + preview
    const y3 = 410;
    this.add.text(70, y3-32, 'Character', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.charIndex = getSelectedCharIndex();
    this._button(70, y3, 44, 44, '◀', () => this._changeChar(-1));
    this._button(370, y3, 44, 44, '▶', () => this._changeChar(+1));
    this.charLabel = this.add.text(130, y3+10, '', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff', padding:{top:6,bottom:2}
    }).setOrigin(0,0);

    // live preview sprite (right side, below leaderboard)
    const previewY = 420;
    this.charPreview = this.add.image(width - 160, previewY, CHARACTERS[this.charIndex].id).setOrigin(0.5,1);
    this._fitPreview();

    // Music picker
    const y4 = 480;
    this.add.text(70, y4-32, 'Music', {fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#cfe4ff'});
    this.trackIndex = getSelectedTrackIndex();
    this._button(70, y4, 44, 44, '◀', () => this._changeTrack(-1));
    this._button(370, y4, 44, 44, '▶', () => this._changeTrack(+1));
    this.trackLabel = this.add.text(130, y4+12, '', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff', padding:{top:6,bottom:2}
    }).setOrigin(0,0);

    // Start button
    this._button(width/2-120, 560, 240, 56, 'START', () => {
      savePrefs(); SFX.ok();
      const charId = CHARACTERS[this.charIndex].id;
      if (this.music && this.music.isPlaying) this.music.stop();
      this.scene.start('play', { mode: GameConfig.mode, difficulty: GameConfig.difficulty, charId });
    });

    // 🔊/🔇 mute
    this.muteText = this.add.text(width-60, 20, (localStorage.getItem('kr_muted')==='1')?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = (localStorage.getItem('kr_muted')==='1');

    // Initialize labels + start music preview
    this._refresh();
    this._changeTrack(0);
    this._changeChar(0);
  }

  // --- Leaderboard fetch + auto-refresh ---
  async _loadLeaderboard(){
    if (!REMOTE_LB_URL){ this.lbText?.setText('Leaderboard offline'); return; }
    try{
      const data = await fetch(`${REMOTE_LB_URL}?t=${Date.now()}`).then(r=>r.json());
      const list = Array.isArray(data) ? data.slice(0,10) : [];
      const lines = list.length
        ? list.map((r,i)=> `${String(i+1).padStart(2,'0')}  ${String(r.name||'???').padEnd(3,' ')}  ${String(r.score||0).padStart(5,' ')}`).join('\n')
        : 'No scores yet.';
      this.lbText.setText(lines);
    }catch{
      this.lbText.setText('Could not load.');
    }
    // refresh every 20s
    this.time.delayedCall(20000, ()=> this._loadLeaderboard());
  }

  // --- Character helpers ---
  _fitPreview(){
    const meta = CHARACTERS[this.charIndex];
    const targetH = meta.height || 64;
    const baseH = this.charPreview.height || targetH;
    const s = targetH / baseH;
    this.charPreview.setScale(s);
  }
  _changeChar(delta){
    this.charIndex = (this.charIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    setSelectedCharIndex(this.charIndex);
    const meta = CHARACTERS[this.charIndex];
    this.charLabel.setText(meta.title.toUpperCase());
    this.charPreview.setTexture(meta.id);
    this._fitPreview();
    SFX.tick();
  }

  // --- Music helpers ---
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
    this.sound.mute = SFX.muted;
  }

  // --- UI helpers ---
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
    this.sel = this.add.text(70, 620,
      `MODE: ${GameConfig.mode.toUpperCase()}    DIFFICULTY: ${GameConfig.difficulty.toUpperCase()}`,
      {fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'}
    );
    if (this.trackLabel) this.trackLabel.setText(TRACKS[this.trackIndex].title.toUpperCase());
    if (this.charLabel)  this.charLabel.setText(CHARACTERS[this.charIndex].title.toUpperCase());
  }
}
