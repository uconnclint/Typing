import { TRACKS } from '../config.js';   // ⬅️ this line is required

export default class BootScene extends Phaser.Scene {
  constructor(){ super('boot'); }

  preload(){
    // Preload every track (paths come from TRACKS)
    TRACKS.forEach(t => this.load.audio(t.id, [t.url]));
  }

  create(){
    const g = this.add.graphics();

    // Runner
    g.fillStyle(0x66ff99, 1); g.fillRect(0,0,16,16);
    g.fillStyle(0x003322, 1); g.fillRect(4,5,2,2); g.fillRect(10,5,2,2); g.fillRect(6,10,4,2);
    g.generateTexture('runner', 16, 16); g.clear();

    // Obstacle
    g.fillStyle(0xff5566, 1); g.fillRect(0,0,24,24);
    g.fillStyle(0x550000, 1); g.fillRect(3,3,18,18);
    g.generateTexture('ob', 24, 24); g.clear();

    // Keycap
    g.fillStyle(0x2b3142, 1); g.fillRect(0,0,36,36);
    g.lineStyle(2, 0x98a1c0, 1); g.strokeRect(1,1,34,34);
    g.generateTexture('keycap', 36, 36); g.destroy();

    this.scene.start('menu');
  }
}
