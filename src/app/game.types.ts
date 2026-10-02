export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function isInsideRect(x: number, y: number, r: ButtonRect): boolean {
  return r.w > 0 && r.h > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  shadowColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type Special = 'laser' | 'double' | 'triple';

export const AMMO_PER_PICKUP: Record<Special, number> = {
  laser: 40,
  double: 50,
  triple: 35
};

export const AMMO_CAP: Record<Special, number> = {
  laser: 120,
  double: 150,
  triple: 105
};

export const BOMB_MAX = 3;
export const KILLS_PER_BOMB = 12;
export const COMBO_WINDOW = 2000;

export const STORAGE_KEY_RECORD = 'spaceship_record_asteroids';
export const STORAGE_KEY_BEST_STAGE = 'spaceship_record_best_stage';

export function getStageAsteroidGoal(stage: number): number {
  return 15 + (stage - 1) * 5;
}
