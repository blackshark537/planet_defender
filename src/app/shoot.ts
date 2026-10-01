import { Entity } from "./models/Entity.class";
import { GameComponent } from "./models/Entity.interface";

export interface ShootConfig {
    x: number;
    y: number;
    id?: string;
    targetX: number;
    targetY: number;
    gun?: number;
    damage?: number;
    piercing?: boolean;
}

export class Shoot extends Entity implements GameComponent {

    static img = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAlCAYAAACQ/8NdAAAB90lEQVR42nXUv2sTcRjH8QccHP0LRHARF23MXQYXXZycHHRycnFyUkQQHMTBglARBRGHIiJSOkQwzV1QCjooKFYIWEuUWFKpWpu7fL+XtPcrj9/H+sGHQgMvQt5PyH15LgmRexxs9Pd5oZnywsH8f2ZKusxp/0x/Ty20Hb+V5NtJlzl5gbnqB2a0E5lTtWWWvZaJxfX2aPi+n+eXPw4TNJmTu/4v6CVFkZdjjjbLUneqBckKbBRjBt3JHa4LNh8z6O4OHi9BlLpL/aO7O5Ntw9rmmEF3WcEHWN0oGXQnP7RvoTcsGXR3l4tfQTcpGXSXT3oJHVsy6E7V0DRhcVAy6O4Obp9BOy4YdJcVzMJCVDDo7m6LfQLv1gsG3d3Bk2l487tg0N0d3D6A12sFg+7ypnsw/zNn0J22vttbXvzIGXR3K0gmIVjNGXSXFdyA599zBt3JD+w1qK/kDLrLbbkCs72MQXeqBslFeLqcMeguK7gAj79lDLpTpWnOw3Q3Y9CdKqE5Bw+/Zgy6k99MzsL9LymD7nQksGfgbidl0J38OXMKbi+lDLq7FQxOwuSnkb31OWWhO3nN6Lj7RZwQlxaGj24upizPaDKnQ3VzwJ+zx3Yic6I7nd2Hg0HND83R7aTL/O9fIp2e2eXX1/dWGrEnJhrRhLyWLuM/jtuOA2NY1NsAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII=',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAlCAYAAACQ/8NdAAAAn0lEQVR42mNgAILso5ryecdN+vOPmu+HYRAfJA6SZ0jbrcSff9TsfuFJ8//oGCQOkmcA6qjHpgCGQfIM+cdN38MElt1t+n/749n/c2+WIkwDyjMg63r749l/EPj2+xOKaSiKkMGoolFFo4qGpSJQGYBVEXKpsuPJbLACEI1SquQfN5uPr3wCyYOLQmTTUBWYvkcpEkFlJLIkiA8uCoEAAFIZn86q0ew5AAAALXRFWHRTb2Z0d2FyZQBieS5ibG9vZGR5LmNyeXB0by5pbWFnZS5QTkcyNEVuY29kZXKoBn/uAAAAAElFTkSuQmCC',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAA5CAYAAADk6wG9AAAApElEQVR42mNgAIIlVlbyK83N+4F4PxLuB4mD5BlmKinxrzI3v7/G0vI/OgaJg+QZVpuZ1WNTAMMgeYbVlpbvYQKnm5v/vzp79v/RsjKEIqA8A7KuL8+e/QeBn58+oZiGoggZjCoaVTSqaFTRqKJRRUNQEaiew6oIuea8OmcOWAGIRqk5V5mZzcdXB4PkwdU9smkolTRQHKXaB7UDkCVBfHB1DwQAQDk/QJmjq6sAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII=',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAlCAYAAACZFGMnAAAAy0lEQVR42mNgQAKrTE3zV5mbr19pbr4fhkH8VZaW9gzYAFDi/BpLy/+4MNCAflQNZmbz8WmAazQziwdrADGQJa7OmfP/1dmzcAziI8uDnQp0832YwIGsrP/YwNGyMoQmoB8ZkE0BmYwNgMSR/LYfRRM+gKxuVNOoplFNo5pGnKbVlpbvYZwvz55h1QASR9EEKmaRC39sALkSAJfl2GoNXBpQqhtCFRpK4Q8DM5WU+EHW4tOw2sysHqQOswqF1Ln3USoxIH+FiYk/sjoAv7I/iTSfZuEAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII='
    ];

    private static defaultDims: { [key: number]: { w: number, h: number } } = {
        0: { w: 9, h: 37 },
        1: { w: 9, h: 185 },
        2: { w: 9, h: 57 },
        3: { w: 13, h: 37 }
    };

    s_img: HTMLImageElement;
    id: string;
    live = 100;
    active: boolean = false;
    damage: number = 100;
    piercing: boolean = false;
    private hitTargets: Set<string> = new Set<string>();

    static generateId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    constructor(conf?: ShootConfig){
        super();
        this.s_img = new Image();
        this.id = conf?.id || Shoot.generateId();
        if (conf) {
            this.reset(conf);
        }
    }

    reset(conf: ShootConfig) {
        this.id = conf?.id || this.id || Shoot.generateId();
        const gunIndex = conf?.gun ? conf.gun : 0;
        this.s_img.src = Shoot.img[gunIndex];
        
        const dims = Shoot.defaultDims[gunIndex] || Shoot.defaultDims[0];
        this.s_img.width = dims.w;
        this.s_img.height = dims.h;

        this.x = conf?.x;
        this.y = conf?.gun === 1 ? conf?.y - 100 : conf?.y;
        this.targeX_pos = conf?.targetX;
        this.targeY_pos = conf?.targetY;
        this.damage = conf?.damage !== undefined ? conf.damage : 100;
        this.piercing = conf?.piercing ?? false;
        this.hitTargets.clear();
        this.live = 100;
        this.active = true;
    }

    hasHit(targetId: string): boolean {
        return this.hitTargets.has(targetId);
    }

    registerHit(targetId: string): void {
        this.hitTargets.add(targetId);
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        ctx.drawImage(
            this.s_img, 
            Math.floor(this.x) + 25,
            Math.floor(this.y) - 100,
            this.s_img.width, 
            this.s_img.height
        );
    }
    
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        this.x -= delta_time * this.lerp(-1, 1, this.targeX_pos);
        this.y -= delta_time * this.lerp(-1, 1, this.targeY_pos);
    }

    distance(enemy): number{
        return this.getDistance(enemy);
    }

    shoot(callback){};
    
    restoreLive(){}

    destroy(callback){
        if(this.y < 0 || this.live <= 0) {
            callback(this.id);
        }
    }

    reduceLive(live: number){
        this.live -= live;
    }
}