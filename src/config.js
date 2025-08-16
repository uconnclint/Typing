export const GameConfig = {
  mode: localStorage.getItem('kr_mode') || 'mixed',
  difficulty: localStorage.getItem('kr_diff') || 'easy',
  times: { easy: 1.5, medium: 1.1, hard: 0.8 },
  width: 900,
  height: 720
};

// 🎵 Update titles/urls if you rename files in /assets
export const TRACKS = [
  { id: 't0', title: 'Pixel Quest',           url: 'assets/Pixel Quest_2025-08-09T14_18_09.mp3' },
  { id: 't1', title: 'Type All Day',          url: 'assets/Type All Day.mp3' },
  { id: 't2', title: 'Type It Up!',           url: 'assets/Type It Up!.mp3' },
  { id: 't3', title: 'Typing With Attitude',  url: 'assets/Typing With Attitude.mp3' },
  { id: 't4', title: 'home row jam',          url: 'assets/home row jam.mp3' },
  { id: 't5', title: 'Broadway Typing',         url: 'assets/Broadway Typing.mp3' },
  { id: 't6', title: 'Imagine Typing',         url: 'assets/Imagine Typing.mp3' },
  { id: 't7', title: 'Type Rap',         url: 'assets/Type Rap.mp3' },
  { id: 't8', title: 'Backstreet Keys',         url: 'assets/Backstreet Keys.mp3' },
  { id: 't9', title: 'Key Pop',         url: 'assets/Key Pop.mp3' },
  { id: 't10', title: 'Typing Drama',         url: 'assets/Typing Drama.mp3' },
  { id: 't11', title: 'Nerdy Typing',         url: 'assets/nerdy typing.mp3' }


  
];

// 🧍 Characters — add more by pushing to this array
// `height` is the on-screen height in pixels (we auto-scale the sprite to this).
export const CHARACTERS = [
  { id: 'boy',   title: 'Boy',         url: 'assets/boy.png',         height: 64 },
  { id: 'girl',  title: 'Gamer Girl',  url: 'assets/gamer girl.png',  height: 64 }
];

export function savePrefs() {
  localStorage.setItem('kr_mode', GameConfig.mode);
  localStorage.setItem('kr_diff', GameConfig.difficulty);
}

// Music helpers
export function getSelectedTrackIndex() {
  const n = parseInt(localStorage.getItem('kr_track_idx') ?? '0', 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, TRACKS.length - 1)) : 0;
}
export function setSelectedTrackIndex(i) {
  localStorage.setItem('kr_track_idx', String(i));
}
  export const REMOTE_LB_URL =
  'https://script.google.com/macros/s/AKfycbx_yj2WazYtxadLvQiEphfweughwsWnuBu_pTh6np6rA-UvdHqVJU7j55Ta0bEZUjCC/exec';
// Character helpers
export function getSelectedCharIndex() {
  const n = parseInt(localStorage.getItem('kr_char_idx') ?? '0', 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, CHARACTERS.length - 1)) : 0;
}
export function setSelectedCharIndex(i) {
  localStorage.setItem('kr_char_idx', String(i));


}
