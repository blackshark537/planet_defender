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

    getDistance(object: Entity): number{
        return Math.hypot(object.x - this.x , object.y - this.y);
    }

    getPosition(){}

    getDotProduct(object: Entity): number{
        return  (object.x*this.x)+(object.y*this.y);
    }
}