export const GameConfig = {
  mode: localStorage.getItem('kr_mode') || 'mixed',
  difficulty: localStorage.getItem('kr_diff') || 'easy',
  times: { easy: 1.5, medium: 1.1, hard: 0.8 },
  width: 900,
  height: 600
};

// 🎵 Update titles/urls if you rename files in /assets
export const TRACKS = [
  { id: 't0', title: 'Pixel Quest',           url: 'assets/Pixel Quest_2025-08-09T14_18_09.mp3' },
  { id: 't1', title: 'Type All Day',          url: 'assets/Type All Day.mp3' },
  { id: 't2', title: 'Type It Up!',           url: 'assets/Type It Up!.mp3' },
  { id: 't3', title: 'Typing With Attitude',  url: 'assets/Typing With Attitude.mp3' },
  { id: 't4', title: 'home row jam',          url: 'assets/home row jam.mp3' },
  { id: 't5', title: 'Default Music',         url: 'assets/music.mp3' }
];

export function savePrefs() {
  localStorage.setItem('kr_mode', GameConfig.mode);
  localStorage.setItem('kr_diff', GameConfig.difficulty);
}

export function getSelectedTrackIndex() {
  const n = parseInt(localStorage.getItem('kr_track_idx') ?? '0', 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(n, TRACKS.length - 1)) : 0;
}
export function setSelectedTrackIndex(i) {
  localStorage.setItem('kr_track_idx', String(i));
}
