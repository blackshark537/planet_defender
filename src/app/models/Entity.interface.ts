import { GunType } from "../shoot.factory";
import { Entity } from "./Entity.class";

export interface EntityInterface{
    x:number;
    y:number;
    speed: number;
    live: number;
    getDistance(object: Entity): number;
    getDotProduct(object: Entity): number;
    invLerp(min: number, max: number, V: number): number;
    lerp(min: number, max: number, T: number): number;
    getPosition();
}

export interface GameComponent {
    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement);
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement);
    destroy(callback);
    shoot(callback);
    distance(entiry: Entity);
    reduceLive(live: number);
    restoreLive();
}

export interface EnemyInterface{
        graph: HTMLImageElement;
        sound: HTMLAudioElement;
        live: number;
}

export interface ItemInterface{
    graph: HTMLImageElement;
    exhaust_graph: HTMLImageElement;
    sound: HTMLAudioElement;
    level: number;
    graphs?:string[];
    exhaust_graphs?:string[];
}

