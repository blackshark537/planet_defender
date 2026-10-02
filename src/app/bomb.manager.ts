import { BOMB_MAX, KILLS_PER_BOMB, Shockwave } from './game.types';
import { MeteorEnemy } from './meteor.enemy';

export class BombManager {
  private _bombs = 1;
  private _bombCharge = 0;
  private _lastBombAt = -9999;
  private _bombFlashTimer = 0;

  get bombs(): number {
    return this._bombs;
  }

  get bombCharge(): number {
    return this._bombCharge;
  }

  get lastBombAt(): number {
    return this._lastBombAt;
  }

  get bombFlashTimer(): number {
    return this._bombFlashTimer;
  }

  update(dt: number): void {
    if (this._bombFlashTimer > 0) {
      this._bombFlashTimer -= dt;
    }
  }

  canDetonate(): boolean {
    const now = performance.now();
    return this._bombs > 0 && now - this._lastBombAt >= 600;
  }

  detonate(
    enemies: Map<string, MeteorEnemy>,
    player: any,
    shockwaves: Shockwave[],
    canvas: HTMLCanvasElement,
    onFeedback: () => void
  ): boolean {
    if (!this.canDetonate()) return false;

    this._bombs--;
    this._lastBombAt = performance.now();

    // Damage all visible enemies on screen
    enemies.forEach(enemy => {
      if (enemy.getPosition().y > -40) {
        enemy.reduceLive(1000);
      }
    });

    if (player && typeof player.setInvulnerable === 'function') {
      player.setInvulnerable(600);
    }

    const p = player && typeof player.getPosition === 'function' ? player.getPosition() : { x: canvas.width / 2, y: canvas.height - 100 };
    const maxR = Math.hypot(canvas.width, canvas.height);
    shockwaves.push(
      { x: p.x + 30, y: p.y - 70, radius: 12, maxRadius: maxR, color: '#ffffff', alpha: 1, life: 650, maxLife: 650 },
      { x: p.x + 30, y: p.y - 70, radius: 12, maxRadius: maxR * 0.7, color: '#ffab00', alpha: 1, life: 500, maxLife: 500 }
    );

    this._bombFlashTimer = 350;
    onFeedback();
    return true;
  }

  addKillCharge(onEarned: (pos: { x: number; y: number }) => void, playerPos: { x: number; y: number }): void {
    if (this._bombs >= BOMB_MAX) {
      this._bombCharge = 0;
      return;
    }
    this._bombCharge++;
    if (this._bombCharge >= KILLS_PER_BOMB) {
      this._bombCharge = 0;
      this._bombs++;
      onEarned(playerPos);
    }
  }

  addStageBonus(onEarned: (pos: { x: number; y: number }) => void, playerPos: { x: number; y: number }): void {
    if (this._bombs < BOMB_MAX) {
      this._bombs++;
      onEarned(playerPos);
    }
  }

  reset(): void {
    this._bombs = 1;
    this._bombCharge = 0;
    this._bombFlashTimer = 0;
    this._lastBombAt = -9999;
  }
}
