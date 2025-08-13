import { KEY_POOLS } from '../utils/keys.js';

export default class OnScreenKeyboard extends Phaser.GameObjects.Container {
  constructor(scene, x=0, y=0){
    super(scene, x, y);
    this.scene = scene;
    this.keys = [];

    const KEY_SPACING = 40;
    const KEY_W = 36;
    const rows = [
      { arr: KEY_POOLS.top,    y: 0,   xOff: 24 },
      { arr: KEY_POOLS.home,   y: 50,  xOff: 44 },
      { arr: KEY_POOLS.bottom, y: 100, xOff: 64 }
    ];

    let maxW = 0;
    rows.forEach(r=>{
      let x = r.xOff;
      r.arr.forEach(k=>{
        const cap = scene.add.image(x, r.y, 'keycap').setOrigin(0,0);
        const txt = scene.add.text(x+18, r.y+10, k.toUpperCase(), {
          fontFamily:'"Press Start 2P"', fontSize:'12px', color:'#cfe4ff'
        }).setOrigin(0.5,0);
        this.add(cap); this.add(txt);
        this.keys.push({k, cap, txt});
        x += KEY_SPACING;
      });
      // row width = left offset + (n-1)*spacing + key width
      const rowWidth = r.xOff + (r.arr.length - 1)*KEY_SPACING + KEY_W;
      maxW = Math.max(maxW, rowWidth);
    });

    this.totalWidth = maxW;       // expose size for layout
    this.totalHeight = 140;
    this.setSize(maxW, this.totalHeight);
  }

  highlight(target){
    this.keys.forEach(({k, cap, txt})=>{
      if (k === target){ cap.setTint(0x3b8cff); txt.setColor('#ffffff'); }
      else { cap.clearTint(); txt.setColor('#9db2d0'); }
    });
  }
}
