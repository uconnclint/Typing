import { TRACKS, CHARACTERS } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor(){ super('boot'); }

  preload(){
    // --- Preload all music (handles spaces/! just fine) ---
    TRACKS.forEach(t => this.load.audio(t.id, t.url));

    // --- Preload all character sprites ---
    CHARACTERS.forEach(c => {
      if (!this.textures.exists(c.id)) this.load.image(c.id, c.url);
    });

    // Optional: surface any asset issues in the console
    this.load.on('loaderror', file => {
      // key + src are super handy when a filename/path is off
      // (e.g., spaces or punctuation mismatches)
      // eslint-disable-next-line no-console
      console.warn('[Boot] Load error:', file?.key, file?.src);
    });
  }

  create(){
    // Generate tiny fallback textures used in-game
    const g = this.add.graphics();

    // Placeholder "runner" (unused if you pick a character sprite)
    g.fillStyle(0x66ff99, 1); g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x003322, 1); g.fillRect(4, 5, 2, 2); g.fillRect(10, 5, 2, 2); g.fillRect(6, 10, 4, 2);
    g.generateTexture('runner', 16, 16); g.clear();

    // Obstacle block
    g.fillStyle(0xff5566, 1); g.fillRect(0, 0, 24, 24);
    g.fillStyle(0x550000, 1); g.fillRect(3, 3, 18, 18);
    g.generateTexture('ob', 24, 24); g.clear();

    // Keycap outline
    g.fillStyle(0x2b3142, 1); g.fillRect(0, 0, 36, 36);
    g.lineStyle(2, 0x98a1c0, 1); g.strokeRect(1, 1, 34, 34);
    g.generateTexture('keycap', 36, 36);
    g.destroy();

    this.scene.start('menu');
  }
}
