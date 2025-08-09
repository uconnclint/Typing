export const GameConfig = {
  mode: localStorage.getItem('kr_mode') || 'mixed',
  difficulty: localStorage.getItem('kr_diff') || 'easy',
  times: { easy: 1.5, medium: 1.1, hard: 0.8 },
  width: 900,
  height: 600
};
export function savePrefs() {
  localStorage.setItem('kr_mode', GameConfig.mode);
  localStorage.setItem('kr_diff', GameConfig.difficulty);
}
