import { MeteorEnemy } from "./meteor.enemy";

export class EnemyPool {
    private pool: MeteorEnemy[] = [];
    private canvas: HTMLCanvasElement;
    private maxPoolSize: number;

    constructor(canvas: HTMLCanvasElement, initialSize: number = 25, maxPoolSize: number = 100) {
        this.canvas = canvas;
        this.maxPoolSize = maxPoolSize;

        // Pre-allocate initial enemy pool to avoid GC pauses during gameplay
        for (let i = 0; i < initialSize; i++) {
            const enemy = new MeteorEnemy(canvas);
            enemy.active = false;
            this.pool.push(enemy);
        }
    }

    /**
     * Obtains an enemy from the pool and re-initializes it.
     * Reuses an inactive instance if available, otherwise creates a new one up to maxPoolSize.
     */
    acquire(
        pos?: { x: number; y: number; targetX?: number; targetY?: number },
        scale?: number,
        asParticle?: boolean,
        live?: number,
        level: number = 1
    ): MeteorEnemy {
        let enemy = this.pool.find(e => !e.active);

        if (!enemy) {
            if (this.pool.length < this.maxPoolSize) {
                enemy = new MeteorEnemy(this.canvas);
                this.pool.push(enemy);
            } else {
                // If maximum pool size is reached, recycle oldest inactive or fallback
                enemy = this.pool.find(e => !e.active) || this.pool[0];
            }
        }

        enemy.reset(this.canvas, pos, scale, asParticle, live, level);
        return enemy;
    }

    /**
     * Releases an enemy back into the pool for future reuse.
     */
    release(enemy: MeteorEnemy): void {
        if (enemy) {
            enemy.active = false;
        }
    }

    /**
     * Releases all managed enemies.
     */
    releaseAll(): void {
        this.pool.forEach(e => {
            e.active = false;
        });
    }

    get totalCount(): number {
        return this.pool.length;
    }

    get activeCount(): number {
        return this.pool.filter(e => e.active).length;
    }
}
