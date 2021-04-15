import { Entity } from "./Entity.class";

export interface EntityInterface{
    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement);
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement);
    destroy(callback);
    shoot(callback);
    distance(entiry: Entity): number;
    reduceLive(live: number);
}

export interface PlayerInterface{
    live:number;
    p_img: any;
}

export interface vector2d{
    x: number;
    y: number;
    add(v: vector2d): void;
    mult(v: vector2d): void;
}