import { powerType } from './powerup';
import { Special, AMMO_CAP, AMMO_PER_PICKUP } from './game.types';

export class WeaponManager {
  private specialAmmo: Record<Special, number> = { laser: 0, double: 0, triple: 0 };
  private specialStack: Special[] = [];

  activeSpecial(): Special | null {
    return this.specialStack.length ? this.specialStack[this.specialStack.length - 1] : null;
  }

  getAmmo(type: Special): number {
    return this.specialAmmo[type] || 0;
  }

  getStack(): Special[] {
    return this.specialStack;
  }

  addSpecial(type: Special): void {
    this.specialAmmo[type] = Math.min(AMMO_CAP[type], this.specialAmmo[type] + AMMO_PER_PICKUP[type]);
    const i = this.specialStack.indexOf(type);
    if (i !== -1) this.specialStack.splice(i, 1);
    this.specialStack.push(type);
  }

  consumeSpecialAmmo(): void {
    const t = this.activeSpecial();
    if (!t) return;
    this.specialAmmo[t]--;
    if (this.specialAmmo[t] <= 0) {
      this.specialAmmo[t] = 0;
      this.specialStack.pop();
    }
  }

  popActiveSpecial(): Special | null {
    if (this.specialStack.length === 0) return null;
    const lostSpecial = this.specialStack.pop() || null;
    if (lostSpecial) {
      this.specialAmmo[lostSpecial] = 0;
    }
    return lostSpecial;
  }

  getWeightedPowerUpType(): powerType {
    const laserWeight = Math.max(0.1, 1.0 - (this.specialAmmo.laser / AMMO_CAP.laser));
    const doubleWeight = Math.max(0.1, 1.0 - (this.specialAmmo.double / AMMO_CAP.double));
    const tripleWeight = Math.max(0.1, 1.0 - (this.specialAmmo.triple / AMMO_CAP.triple));

    const pool = [
      { type: powerType.PILL, weight: 1.2 },
      { type: powerType.SHIELD, weight: 1.0 },
      { type: powerType.LASER, weight: laserWeight },
      { type: powerType.DOUBLE, weight: doubleWeight },
      { type: powerType.TRIPLE, weight: tripleWeight }
    ];
    const totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of pool) {
      if (rand < item.weight) return item.type;
      rand -= item.weight;
    }
    return powerType.DOUBLE;
  }

  applyPowerUp(type: powerType, player: any, onBonusScore?: () => void): void {
    switch (type) {
      case powerType.SHIELD:
        if (player && typeof player.activateShield === 'function') {
          player.activateShield(100);
        }
        break;

      case powerType.PILL:
        if (player && typeof player.restoreLive === 'function') {
          player.restoreLive();
        }
        break;

      case powerType.BASIC:
        if (player && typeof player.restoreLive === 'function') {
          player.restoreLive();
        }
        if (onBonusScore) onBonusScore();
        break;

      case powerType.LASER:
        this.addSpecial('laser');
        break;

      case powerType.DOUBLE:
        this.addSpecial('double');
        break;

      case powerType.TRIPLE:
        this.addSpecial('triple');
        break;
    }
  }

  reset(): void {
    this.specialStack.length = 0;
    this.specialAmmo.laser = 0;
    this.specialAmmo.double = 0;
    this.specialAmmo.triple = 0;
  }
}
