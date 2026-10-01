import { Entity } from "./models/Entity.class";
import { GameComponent } from "./models/Entity.interface";
//import { AudioPlayer } from './native.audio';

export class Background extends Entity implements GameComponent{

    effect = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAABsCAYAAACmYahKAAAAwklEQVR42sXVOQqEQBCF4Z593/fTeh8v4QUMzQwMRGhaXFvzQWGSwTfJ8KiCP/oqq6CUUmr0Iwo6jjNGiaDruhMUCz3Pm6JE0Pf9GeoPDIJgjhLBMAwXKBZGUbREiWAcxysUC5MkWaNYqLXeoETQGLNFsTBN0x2KhVmW7VEimOf5AcXCoiiOKBaWZXlCiWBVVWcUC+u6vqCIeEWx0Fp7Q0nhHcXCpmkeKCl8oljYtu0L1Z9sCPqTdS9iCPvX0c33wgfeOzebVnR3wOIAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII=';
    effects = [];
    bg_img;
    planet_img: HTMLImageElement;
    effect_img: HTMLImageElement;
    level = 1;
    planetActive = true;
    isTransitioning = false;
    transitTimer = 0;
    transitDuration = 30000; // 30 seconds after planet passes
    private onLevelUpCallback: (newLevel: number) => void = () => {};
    private onPlanetPassedCallback: (clearedLevel: number) => void = () => {};
    
    constructor(canvas: HTMLCanvasElement){
        super();

        this.planet_img = new Image();
        this.planet_img.src = `assets/Planet${this.level}.png`;

        this.y = -350;
        this.planetActive = true;
        this.isTransitioning = false;

        this.effect_img = new Image();

        this.effect_img.src = this.effect;
        if(this.effects.length === 0 ){
            for (let i = 0; i < 5; i++) {
                this.effects.push({
                    x: Math.round(Math.random()*canvas.width),
                    y: Math.round(Math.random()*canvas.height)*-1
                })
            }
        }
    }

    onLevelUp(callback: (newLevel: number) => void): void {
        this.onLevelUpCallback = callback;
    }

    onPlanetPassed(callback: (clearedLevel: number) => void): void {
        this.onPlanetPassedCallback = callback;
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0,0, canvas.width, canvas.height);

        // Draw Planet only when active in the current sector
        if (this.planetActive && this.planet_img.complete && this.planet_img.naturalWidth > 0) {
            ctx.drawImage(
                this.planet_img,
                -180, 
                this.y,
                this.planet_img.width || this.planet_img.naturalWidth, 
                this.planet_img.height || this.planet_img.naturalHeight
            );
        }

        this.effects.forEach(ef =>{
            if (this.effect_img.complete && this.effect_img.naturalWidth > 0) {
                ctx.drawImage(
                    this.effect_img, 
                    Math.floor(ef.x),
                    Math.floor(ef.y),
                    this.effect_img?.width, 
                    this.effect_img?.height
                );
            }
        });
    }

    distance(entity){
        return null;
    }

    shake(dt:number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        this.preShake(ctx);
        this.draw(dt, ctx, canvas);
        this.postShake(ctx);
    }

    preShake(ctx: CanvasRenderingContext2D) {
        ctx.save();
        let dx = this.lerp(-20,20,Math.random());
        //let dy = this.lerp(-10,10,Math.random());
        ctx.translate(dx, 0);
    }

    postShake(ctx: CanvasRenderingContext2D) {
        ctx.restore();
    }
  
    restoreLive(){}

    reduceLive(live: number){
        
    }

    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        const planetHeight = this.planet_img.naturalHeight || this.planet_img.height || 1000;

        if (this.planetActive) {
            // Planet drifts steadily across space (~35-40s per planet)
            const planetSpeed = 0.04 + (this.level - 1) * 0.0025;
            this.y += delta_time * planetSpeed;

            // When the planet completely exits the bottom of the screen
            if (this.y > canvas.height + 150) {
                // The planet has passed! Enter 30-second deep space transition
                this.planetActive = false;
                this.isTransitioning = true;
                this.transitTimer = this.transitDuration;
                this.onPlanetPassedCallback(this.level);
            }
        } else if (this.isTransitioning) {
            // Countdown 30 seconds after the planet has passed before next level
            this.transitTimer -= delta_time;
            if (this.transitTimer <= 0) {
                this.isTransitioning = false;
                this.level = this.level < 14 ? this.level + 1 : 1;
                this.planet_img.src = `assets/Planet${this.level}.png`;
                this.y = -400 - planetHeight;
                this.planetActive = true;
                this.onLevelUpCallback(this.level);
            }
        }

        // Hyperspace speed increase during deep space transition
        const effectSpeed = (0.4 + (this.level - 1) * 0.025) * (this.isTransitioning ? 1.35 : 1.0);
        this.effects.forEach(ef =>{
            ef.y += effectSpeed * delta_time;
            if(ef.y > canvas.height+50){
                ef.x = Math.round(Math.random()*canvas.width);
                ef.y = Math.round(Math.random()*canvas.height)*-1
            };
        })
    }

    shoot(callback){
    }
    destroy(callback){
        callback(this.level);
    }
}