import { PowerUp, powerType } from "./powerup";

export const POWERUP_AMMO: Record<powerType, number> = {
    [powerType.BASIC]: Infinity,
    [powerType.LASER]: Infinity,
    [powerType.DOUBLE]: 500,
    [powerType.TRIPLE]: 350,
    [powerType.SHIELD]: 0,
    [powerType.PILL]: 0
};

export class PowerUpPool {
    private pool: PowerUp[] = [];
    private maxPoolSize: number;

    static getBaseAmmo(type: powerType): number {
        return POWERUP_AMMO[type] ?? 0;
    }

    constructor(initialSize: number = 10, maxPoolSize: number = 30) {
        this.maxPoolSize = maxPoolSize;
        // Preload all power-up images once into static cache
        [
            powerType.SHIELD,
            powerType.PILL,
            powerType.BASIC,
            powerType.TRIPLE,
            powerType.LASER,
            powerType.DOUBLE
        ].forEach(type => PowerUp.getImage(type));

        // Pre-warm the power-up pool to eliminate runtime allocations
        for (let i = 0; i < initialSize; i++) {
            const powerUp = new PowerUp(0, 0, powerType.SHIELD);
            powerUp.active = false;
            this.pool.push(powerUp);
        }
    }

    /**
     * Acquires an available PowerUp from the pool and initializes its state.
     */
    acquire(x: number, y: number, type: powerType): PowerUp {
        let powerUp = this.pool.find(p => !p.active);

        if (!powerUp) {
            if (this.pool.length < this.maxPoolSize) {
                powerUp = new PowerUp(x, y, type);
                this.pool.push(powerUp);
            } else {
                // If capacity is reached, recycle oldest inactive or fallback
                powerUp = this.pool.find(p => !p.active) || this.pool[0];
            }
        }

        powerUp.reset(x, y, type);
        return powerUp;
    }

    /**
     * Releases a PowerUp back into the pool.
     */
    release(powerUpOrId: PowerUp | string): void {
        if (!powerUpOrId) return;
        const powerUp = typeof powerUpOrId === 'string'
            ? this.pool.find(p => p.id === powerUpOrId)
            : powerUpOrId;
        if (powerUp) {
            powerUp.active = false;
        }
    }

    /**
     * Releases all PowerUps back to the pool.
     */
    releaseAll(): void {
        this.pool.forEach(p => (p.active = false));
    }

    get totalCount(): number {
        return this.pool.length;
    }

    get activeCount(): number {
        return this.pool.filter(p => p.active).length;
    }
}
