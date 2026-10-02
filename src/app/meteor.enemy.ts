import { config } from "rxjs";
import { Entity } from "./models/Entity.class";
import { EnemyInterface, GameComponent } from "./models/Entity.interface";
import { powerType } from "./powerup";

export class MeteorEnemy extends Entity implements GameComponent{

    static enemy_graphs = {
        meteors:{
            0:{
                big: {
                    imgs: [
                        'data:image/png;base64,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',
                        'data:image/png;base64,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',
                        'data:image/png;base64,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',
                        'data:image/png;base64,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',
                    ],
                    graph: new Image(),
                    sound: new Audio(),
                    live: 500
                }
            },
            1:{
                big: {
                    imgs: [
                        'data:image/png;base64,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',
                        'data:image/png;base64,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',
                        'data:image/png;base64,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',
                    ],
                    graph: new Image(),
                    sound: new Audio(),
                    live: 1500
                }
            }
        }
        
    }

    id: string;
    active: boolean = true;
    enemy: EnemyInterface;
    timer = 0;
    timer2 = 0;
    isParticle = false;
    powers = [powerType.PILL, powerType.SHIELD, powerType.LASER, powerType.DOUBLE, powerType.TRIPLE];
    pos;
    fallSpeed: number = 0.4;
    isGiant: boolean = false;

    static generateId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    constructor(
        canvas: HTMLCanvasElement, 
        pos?: {x: number; y: number; targetX?: number, targetY?: number},
        scale?: number,
        asParticle?: boolean,
        live?: number,
        id?: string
    ){
        super();
        this.id = id || MeteorEnemy.generateId();
        this.enemy = {
            graph: new Image(),
            sound: new Audio(),
            live: 500
        };
        this.reset(canvas, pos, scale, asParticle, live);
    }

    reset(
        canvas: HTMLCanvasElement, 
        pos?: {x: number; y: number; targetX?: number, targetY?: number},
        scale?: number,
        asParticle?: boolean,
        live?: number,
        level: number = 1
    ){
        this.pos = pos ? { ...pos } : undefined;
        this.scale = scale !== undefined ? this.lerp(0.1, 0.3, scale) : 1;
        this.hasPowerUp = Math.random() >= 0.88;
        this.isParticle = asParticle ? asParticle : false;

        // Ratio of giant meteors increases with level (15% at lvl 1 up to 45% at lvl 10+)
        const giantChance = Math.min(0.45, 0.15 + (level - 1) * 0.03);
        const isGiant = Math.random() < giantChance;
        this.isGiant = isGiant;
        const indx = isGiant ? 1 : 0;

        const imgs = MeteorEnemy.enemy_graphs.meteors[indx].big.imgs;
        const src = imgs[Math.floor(Math.random() * imgs.length)];
        this.enemy.graph.src = src;

        // Health scaling based on level
        const baseLive = indx === 1 ? (1500 + (level - 1) * 60) : (500 + (level - 1) * 25);
        this.enemy.live = live !== undefined ? live : baseLive;

        // Speed scaling with level: ~0.36 at lvl 1 to ~0.75+ at lvl 14
        const baseSpeed = 0.36 + (level - 1) * 0.03;
        this.fallSpeed = baseSpeed + (Math.random() - 0.5) * 0.08;

        const enemyWidth = this.enemy?.graph?.width || 80;
        this.x = pos?.x !== undefined ? pos.x : Math.round(Math.random() * (canvas.width - enemyWidth));
        this.y = pos?.y !== undefined ? pos.y : Math.round(Math.random() * 300) * -1;

        // Slight drift across lanes at higher levels
        const drift = (level > 2) ? (Math.random() - 0.5) * Math.min(180, (level - 1) * 20) : 0;
        this.targeX_pos = pos?.targetX !== undefined ? pos.targetX : (this.x + drift);
        this.targeY_pos = pos?.targetY !== undefined ? pos.targetY : canvas.height * 2;

        this.timer = 0;
        this.timer2 = 0;
        this.active = true;
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        ctx.drawImage(
            this.enemy.graph,
            Math.floor(this.x),
            Math.floor(this.y),
            this.enemy.graph.width * this.scale,
            this.enemy.graph.height * this.scale
        );
    }

    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        this.x = this.lerp(this.x, this.targeX_pos, this.isParticle ? 0.01 : 0.02);
        if(this.isParticle){
            this.y = this.lerp(this.y, this.targeY_pos, 0.01);
        } else {
            this.y += delta_time * this.fallSpeed;
        }
        this.timer += delta_time;
        this.timer2 += delta_time;
        if(this.timer>300){
            this.enemy.sound.pause();
            this.enemy.sound.currentTime = 0;
            this.timer=0;
        }

        
        if(this.isParticle && this.timer2 > 1000){
            this.enemy.live = 0;
        }

        if(this.y > canvas.height+50 || this.x > canvas.width+50 || this.x < 0-50){
            this.enemy.live = 0;
        }
    }

    distance(entity){
        return !this.isParticle? this.getDistance(entity) : null;
    }

    reduceLive(live: number){
        this.enemy.live -= live;
    }

    shoot(callback){}

    destroy(callback){
        if(this.enemy.live <= 0){
            callback({
                onDestroy:true,
                onPowerUp: this.hasPowerUp,
                powerUpType: this.powers[Math.floor(Math.random()*this.powers.length)],
                isGiant: this.isGiant
            });
        }
    }

    restoreLive(){
        this.enemy.live=100;
    }
    getCenter(): { x: number; y: number } {
        const w = (this.enemy?.graph?.width || 80) * this.scale;
        const h = (this.enemy?.graph?.height || 80) * this.scale;
        return {
            x: this.x + w / 2,
            y: this.y + h / 2
        };
    }

    getCollisionRadius(): number {
        const w = this.enemy?.graph?.width || 80;
        const h = this.enemy?.graph?.height || 80;
        return Math.min(w, h) * this.scale * 0.45;
    }

    getPosition(){
        return {
            x: this.x,
            y: this.y
        }
    }
}