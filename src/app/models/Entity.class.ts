import { EntityInterface, vector2d } from "./Entity.interface";

export class Entity {
    
    position: vector2d;
    speed=0.2;
    x = 0;
    y = 0;
    p_x = 0;
    p_y = 0;

    lerp(min: number, max: number, T: number){
        return (1.0-T)*min+max*T;
    }

    invLerp(min: number, max: number, V: number){
        return (V-min)/(max-min);
    }

    getDistance(object: Entity): number{
        let dist = Math.pow(object.x - this.x,2) + Math.pow(object.y - this.y,2);
        return Math.sqrt(dist);
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){}
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){}
    shoot(callback){};
    destroy(callback){}
}