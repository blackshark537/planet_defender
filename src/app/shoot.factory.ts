import { Shoot, ShootConfig } from "./shoot";

export enum GunType {
    BASIC = 'basic',
    LASER = 'laser',
    DOUBLE = 'double',
    TRIPLE = 'triple'
}

export interface GunStats {
    damage: number;
    piercing: boolean;
}

export const GUN_STATS: Record<GunType, GunStats> = {
    [GunType.BASIC]: { damage: 125, piercing: false },  // 125 dmg (takes 4 hits for 500HP meteor)
    [GunType.DOUBLE]: { damage: 175, piercing: false }, // 175 x 2 = 350 dmg (takes 2 volleys)
    [GunType.TRIPLE]: { damage: 150, piercing: false }, // 150 x 3 = 450 potential dmg (wide sweep)
    [GunType.LASER]: { damage: 400, piercing: true }    // 400 dmg + pierces through multiple meteors
};

export class ShootFactory {
    private pool: Shoot[] = [];
    private maxPoolSize: number;

    constructor(initialSize: number = 30, maxPoolSize: number = 150) {
        this.maxPoolSize = maxPoolSize;
        // Pre-warm the shoot pool to avoid allocations during shooting
        for (let i = 0; i < initialSize; i++) {
            const shoot = new Shoot();
            shoot.active = false;
            this.pool.push(shoot);
        }
    }

    /**
     * Acquires a shoot instance from the pool and initializes it.
     */
    acquire(conf: ShootConfig): Shoot {
        let shoot = this.pool.find(s => !s.active);
        if (!shoot) {
            if (this.pool.length < this.maxPoolSize) {
                shoot = new Shoot();
                this.pool.push(shoot);
            } else {
                // If pool limit is reached, recycle the first inactive or fallback
                shoot = this.pool.find(s => !s.active) || this.pool[0];
            }
        }
        shoot.reset(conf);
        return shoot;
    }

    /**
     * Releases a shoot back into the pool.
     */
    release(shootOrId: Shoot | string): void {
        if (!shootOrId) return;
        const shoot = typeof shootOrId === 'string'
            ? this.pool.find(s => s.id === shootOrId)
            : shootOrId;
        if (shoot) {
            shoot.active = false;
        }
    }

    /**
     * Releases all shoots back to pool.
     */
    releaseAll(): void {
        this.pool.forEach(s => (s.active = false));
    }

    getShoot(gun: string, playerPos: { x: number; y: number }): Shoot[] {
        const stats = GUN_STATS[gun as GunType] || GUN_STATS[GunType.BASIC];
        switch (gun) {
            case GunType.BASIC:
                return [
                    this.acquire({
                        x: playerPos.x,
                        y: playerPos.y - 40,
                        targetY: 0.9,
                        targetX: 0.5,
                        gun: 0,
                        damage: stats.damage,
                        piercing: stats.piercing
                    })
                ];
            
            case GunType.TRIPLE:
                return [
                    this.acquire({
                        x: playerPos.x,
                        y: playerPos.y - 40,
                        targetY: 1,
                        targetX: 0.6,
                        gun: 3,
                        damage: stats.damage,
                        piercing: stats.piercing
                    }),
                    this.acquire({
                        x: playerPos.x,
                        y: playerPos.y - 40,
                        targetY: 0.9,
                        targetX: 0.5,
                        gun: 3,
                        damage: stats.damage,
                        piercing: stats.piercing
                    }),
                    this.acquire({
                        x: playerPos.x,
                        y: playerPos.y - 40,
                        targetY: 1,
                        targetX: 0.4,
                        gun: 3,
                        damage: stats.damage,
                        piercing: stats.piercing
                    })
                ];
        
            case GunType.LASER:
                return [
                    this.acquire({
                        x: playerPos.x,
                        y: playerPos.y - 40,
                        targetY: 0.9,
                        targetX: 0.5,
                        gun: 1,
                        damage: stats.damage,
                        piercing: stats.piercing
                    })
                ];

            case GunType.DOUBLE:
                return [
                    this.acquire({
                        x: playerPos.x - 30,
                        y: playerPos.y - 40,
                        targetY: 1,
                        targetX: 0.5,
                        gun: 2,
                        damage: stats.damage,
                        piercing: stats.piercing
                    }),
                    this.acquire({
                        x: playerPos.x + 30,
                        y: playerPos.y - 40,
                        targetY: 1,
                        targetX: 0.5,
                        gun: 2,
                        damage: stats.damage,
                        piercing: stats.piercing
                    })
                ];

            default:
                return [];
        }
    }

    get totalCount(): number {
        return this.pool.length;
    }

    get activeCount(): number {
        return this.pool.filter(s => s.active).length;
    }
}