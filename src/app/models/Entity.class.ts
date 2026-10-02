import { GunType } from "../shoot.factory";
import { EntityInterface } from "./Entity.interface";

export class Entity implements EntityInterface{
    
    speed=0.2;
    x = 0;
    y = 0;
    targeX_pos = 0;
    targeY_pos = 0;
    live = 100;
    hasPowerUp: boolean=false;
    scale = 0;
    width=0;
    height=0;

    lerp(min: number, max: number, T: number): number{
        return (1.0-T)*min+max*T;
    }

    invLerp(min: number, max: number, V: number): number{
        return (V-min)/(max-min);
    }

    getCenter(): { x: number; y: number } {
        return {
            x: this.x + (this.width || 0) / 2,
            y: this.y + (this.height || 0) / 2
        };
    }

    getCollisionRadius(): number {
        return (Math.min(this.width || 40, this.height || 40) * (this.scale || 1)) / 2;
    }

    getDistance(object: Entity): number{
        const c1 = (this as any).getCenter ? (this as any).getCenter() : { x: this.x, y: this.y };
        const c2 = (object as any)?.getCenter ? (object as any).getCenter() : ((object as any)?.getPosition ? (object as any).getPosition() : { x: object?.x || 0, y: object?.y || 0 });
        return Math.hypot(c2.x - c1.x, c2.y - c1.y);
    }

    getPosition(){
        return {
            x: this.x,
            y: this.y
        };
    }

    getDotProduct(object: Entity): number{
        return  (object.x*this.x)+(object.y*this.y);
    }
}