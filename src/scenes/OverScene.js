import { SFX } from '../utils/audio.js';
import { REMOTE_LB_URL } from '../config.js';

const BANNED = new Set(['ASS','CUM','WTF']); // edit/add as you like

function askInitials() {
  let last = (localStorage.getItem('kr_last_name') || '').toUpperCase();
  for (let i = 0; i < 3; i++) {
    const raw = window.prompt('Enter 3-letter initials (A–Z / 0–9):', last || '');
    if (raw === null) break; // cancel
    let s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
    if (s.length === 3 && !BANNED.has(s)) { localStorage.setItem('kr_last_name', s); return s; }
    alert('Please enter exactly 3 letters/numbers (no banned combos).');
  }
  return 'KID';
}

async function postScore(url, payload) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
      body: JSON.stringify(payload)
    });
    return await r.json();
  } catch { return { ok:false }; }
}

async function fetchTop(url) {
  try {
    const r = await fetch(`${url}?t=${Date.now()}`); // cache-bust
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export default class OverScene extends Phaser.Scene {
  constructor(){ super('over'); }
  init(data){ this.dataObj = data; }

  async create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);
    this.add.text(width/2, 72, 'GAME OVER', {
      fontFamily:'"Press Start 2P"', fontSize:'32px', color:'#ffb3c1'
    }).setOrigin(0.5);

    const { time, letters, score, mode, difficulty, reason } = this.dataObj;

    this.add.text(width/2, 120, (reason || 'DONE').toUpperCase(), {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#f8d7da'
    }).setOrigin(0.5);

    const stats = [
      `TIME SURVIVED: ${time.toFixed(1)}s`,
      `LETTERS TYPED: ${letters}`,
      `TOTAL SCORE: ${score}`,
      `MODE: ${mode.toUpperCase()}    DIFFICULTY: ${difficulty.toUpperCase()}`
    ].join('\n');
    this.add.text(width/2, 170, stats, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff', align:'center', lineSpacing:8
    }).setOrigin(0.5);

    // 🔊/🔇 mute
    const muted = (localStorage.getItem('kr_muted')==='1');
    this.muteText = this.add.text(width-60, 20, muted?'🔇':'🔊', {fontSize:'28px'})
      .setInteractive({useHandCursor:true})
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        this.muteText.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = muted;

    // Ask for initials (3 chars, banned list enforced)
    const name = askInitials();

    // Send score to Google Sheets (ignore errors so UI stays snappy)
    if (REMOTE_LB_URL) {
      await postScore(REMOTE_LB_URL, { name, score, letters, time, mode, difficulty });
    }

    // Render remote Top-10
    this.add.text(width/2, 260, 'TOP 10 — CLASS LEADERBOARD', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff'
    }).setOrigin(0.5);

    const list = REMOTE_LB_URL ? await fetchTop(REMOTE_LB_URL) : [];
    const lines = (list.length ? list : [])
      .map((r,i)=> `${String(i+1).padStart(2,'0')}  ${String((r.name||'???')).padEnd(3,' ')}  ${String(r.score||0).padStart(5,' ')}`)
      .join('\n') || 'No scores yet.';

    this.add.text(width/2, 298, lines, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#e6f3ff', align:'center', lineSpacing:6
    }).setOrigin(0.5);

    // Buttons
    this._button(width/2-220, height-120, 200, 54, 'RESTART', () => this.scene.start('menu'));
    this._button(width/2+20,  height-120, 200, 54, 'MENU',    () => this.scene.start('menu'));
  }

  _button(x,y,w,h,label,cb){
    const bg = this.add.rectangle(x,y,w,h,0x2a334d).setOrigin(0);
    const txt = this.add.text(x+w/2, y+h/2, label, {
      fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#e6f3ff'
    }).setOrigin(0.5);
    bg.setInteractive({useHandCursor:true})
      .on('pointerover', ()=> bg.setFillStyle(0x344062))
      .on('pointerout',  ()=> bg.setFillStyle(0x2a334d))
      .on('pointerdown', cb);
    return {bg, txt};
  }
}
