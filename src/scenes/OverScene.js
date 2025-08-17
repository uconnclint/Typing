import { SFX } from '../utils/audio.js';
import { REMOTE_LB_URL } from '../config.js';

// Block a few combos; add more as needed (UPPERCASE A–Z/0–9)
const BANNED = new Set(['ASS','CUM','WTF']);

function askInitials(){
  let last = (localStorage.getItem('kr_last_name') || '').toUpperCase();
  for (let i = 0; i < 3; i++){
    const raw = window.prompt('Enter 3-letter initials (A–Z / 0–9):', last || '');
    if (raw === null) break;
    let s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
    if (s.length === 3 && !BANNED.has(s)) {
      localStorage.setItem('kr_last_name', s);
      return s;
    }
    alert('Please enter exactly 3 letters/numbers (no banned combos).');
  }
  return 'KID';
}

async function postScore(url, payload){
  try{
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
      body: JSON.stringify(payload)
    });
    return await r.json();
  }catch(_e){
    return { ok:false };
  }
}

async function fetchTop(url){
  try{
    const r = await fetch(`${url}?t=${Date.now()}`); // cache-bust so it refreshes
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  }catch(_e){
    return [];
  }
}

export default class OverScene extends Phaser.Scene {
  constructor(){ super('over'); }
  init(data){ this.dataObj = data || {}; }

  async create(){
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0d1220).setOrigin(0);

    // Title
    this.add.text(width/2, 64, 'GAME OVER', {
      fontFamily:'"Press Start 2P"', fontSize:'32px', color:'#ffb3c1'
    }).setOrigin(0.5, 0);

    const time = Number(this.dataObj.time || 0);
    const letters = Number(this.dataObj.letters || 0);
    const score = Number(this.dataObj.score || 0);
    const mode = String(this.dataObj.mode || 'mixed');
    const difficulty = String(this.dataObj.difficulty || 'easy');
    const reason = String(this.dataObj.reason || 'DONE');

    // Reason
    this.add.text(width/2, 110, reason.toUpperCase(), {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#f8d7da'
    }).setOrigin(0.5, 0);

    // Stats (TOP-ANCHORED so height measures correctly)
    const stats = [
      `TIME SURVIVED: ${time.toFixed(1)}s`,
      `LETTERS TYPED: ${letters}`,
      `TOTAL SCORE: ${score}`,
      `MODE: ${mode.toUpperCase()}    DIFFICULTY: ${difficulty.toUpperCase()}`
    ].join('\n');
    const statsText = this.add.text(width/2, 145, stats, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#cfe4ff',
      align:'center', lineSpacing:8
    }).setOrigin(0.5, 0);

    // 🔊/🔇 mute
    const muted = (localStorage.getItem('kr_muted')==='1');
    const muteBtn = this.add.text(width-60, 20, muted ? '🔇' : '🔊', { fontSize:'28px' })
      .setInteractive({ useHandCursor:true })
      .on('pointerdown', () => {
        SFX.setMuted(!SFX.muted);
        this.sound.mute = SFX.muted;
        muteBtn.setText(SFX.muted ? '🔇' : '🔊');
      });
    this.sound.mute = muted;

    // Ask initials + POST
    const name = askInitials();
    if (REMOTE_LB_URL) {
      // fire-and-forget; don't block UI if it fails
      await postScore(REMOTE_LB_URL, { name, score, letters, time, mode, difficulty });
    }

    // Leaderboard header positioned *below* the stats
    const headerY = statsText.y + statsText.height + 24;
    this.add.text(width/2, headerY, 'TOP 10 — CLASS LEADERBOARD', {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#9bd0ff',
      padding: { top: 8, bottom: 2 }
    }).setOrigin(0.5, 0).setResolution(2);

    // Fetch and render Top-10 list
    const listY = headerY + 28;
    const list = REMOTE_LB_URL ? await fetchTop(REMOTE_LB_URL) : [];
    const lines = (list.length ? list : [])
      .map((r,i)=> {
        const rank = String(i+1).padStart(2,'0');
        const n = String(r.name || '???').toUpperCase().padEnd(3,' ');
        const sc = String(r.score || 0).padStart(5,' ');
        return `${rank}  ${n}  ${sc}`;
      })
      .join('\n') || 'No scores yet.';
    this.add.text(width/2, listY, lines, {
      fontFamily:'"Press Start 2P"', fontSize:'14px', color:'#e6f3ff',
      align:'center', lineSpacing:6
    }).setOrigin(0.5, 0);

    // Buttons at the bottom
    this._button(width/2 - 220, height - 120, 200, 54, 'RESTART', () => this.scene.start('menu'));
    this._button(width/2 +  20, height - 120, 200, 54, 'MENU',    () => this.scene.start('menu'));
  }

  _button(x,y,w,h,label,cb){
    const bg = this.add.rectangle(x,y,w,h,0x2a334d).setOrigin(0);
    const txt = this.add.text(x + w/2, y + h/2, label, {
      fontFamily:'"Press Start 2P"', fontSize:'16px', color:'#e6f3ff'
    }).setOrigin(0.5);
    bg.setInteractive({ useHandCursor:true })
      .on('pointerover', ()=> bg.setFillStyle(0x344062))
      .on('pointerout',  ()=> bg.setFillStyle(0x2a334d))
      .on('pointerdown', cb);
    return { bg, txt };
  }
}
