// 标签页：胶囊按钮行，活动项高亮
import Phaser from 'phaser';
import { FONT } from '../../i18n';
import { PAL } from '../../gfx/palette';
import { SFX } from '../../audio/sound';
import { Rect, hstack } from '../layout';

export interface TabSpec {
  id: string;
  label: string;
  badge?: boolean;
}

export class Tabs extends Phaser.GameObjects.Container {
  private tabs: TabSpec[];
  private activeId: string;
  private cells: Rect[];
  private gfx: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, r: Rect, tabs: TabSpec[], onSwitch: (id: string) => void, activeId?: string) {
    super(scene, 0, 0);
    this.tabs = tabs;
    this.activeId = activeId ?? tabs[0].id;
    this.cells = hstack(r, 8, tabs.map(() => 'flex' as const));
    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    tabs.forEach((tab, i) => {
      const c = this.cells[i];
      const txt = scene.add.text(c.x + c.w / 2, c.y + c.h / 2, tab.label, {
        fontFamily: FONT, fontSize: Math.min(17, c.h * 0.42) + 'px', fontStyle: 'bold', color: PAL.inkCss,
      }).setOrigin(0.5);
      // 窄屏多标签（图鉴 6 标签 / 选图难度组）时按胶囊宽度缩字号，杜绝顶边溢出（CX2）
      let fs = Math.min(17, c.h * 0.42);
      const avail = c.w - 12;
      while (fs > 10 && txt.width > avail) {
        fs -= 1;
        txt.setFontSize(fs);
      }
      this.labels.push(txt);
      this.add(txt);
      const zone = scene.add.zone(c.x, c.y, c.w, c.h).setOrigin(0).setInteractive({ useHandCursor: true });
      this.add(zone);
      zone.on('pointerup', () => {
        if (this.activeId === tab.id) return;
        SFX.uiClick();
        this.activeId = tab.id;
        this.redraw();
        onSwitch(tab.id);
      });
    });
    this.redraw();
    scene.add.existing(this);
  }

  get activeTab(): string {
    return this.activeId;
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();
    this.tabs.forEach((tab, i) => {
      const c = this.cells[i];
      const r = Math.min(12, c.h / 2);
      const on = tab.id === this.activeId;
      g.fillStyle(on ? 0xffeec0 : PAL.cardBg, on ? 1 : 0.7);
      g.fillRoundedRect(c.x, c.y, c.w, c.h, r);
      g.lineStyle(on ? 3 : 2, on ? 0xe2b452 : PAL.cardEdge, 1);
      g.strokeRoundedRect(c.x, c.y, c.w, c.h, r);
      if (tab.badge) {
        g.fillStyle(0xe87878, 1);
        g.fillCircle(c.x + c.w - 8, c.y + 8, 5);
      }
      this.labels[i].setColor(on ? '#8A6420' : PAL.inkCss).setAlpha(on ? 1 : 0.75);
    });
  }
}
