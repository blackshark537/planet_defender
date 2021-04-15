import { Entity } from "./models/Entity.class";
import { EntityInterface } from "./models/Entity.interface";

export class Enemy extends Entity implements EntityInterface{

    enemy_graphs = {
        meteors:{
            0:{
                big: {
                    img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAABUCAYAAACbWvnHAAAGmklEQVR42u2dW24cRRSGvQOWgMQb4gE0dkCES/A4IQoxcXCILDtRCIRACASDhJCiSAQJECAQQYBAPHkJXgJLYAleAksY/A0+46JdPd1VdaqrqntGOooUj6a76+/zVZ1LVy8tKXy2V0+d2RmPHvbVuL6lkj47a8u718+uTPpuO+OVv4sR5dp49A8nvbv5cm/txrlTR8KMHmYvyNbqygYne2f99OSrmxd6a59eOTPzmK0Xn3o6b3SNR3uc6GdXV3stCnb74vNlYEzQ9eWN870X5Yvrr+aPsaGgqyiMDQldxWBsSOgqAmOCrlsXnhuUIFljTNDFyQ1RlCwxJujClYcqSlYYKx1d3966OPnu3fWp/fDe65Of7mzMzPW3WORkgbES0PXog43Jrx9tTu23e5uTPz+52sp8hCEkSI6xQ1EOYqDrm3dem93BYvyf6+/8fPdyaxFsxnFdjsfqMynGcNEQdHHBcgdjf+y+2Wqg+C6DzZ38/e31KYJiCIL9/vGVyddvu13X51vjdBjbHq88CkEXWAkdNNNA0y8fvjEVi3+1fpfzLAZjoehy4XtqwyOzx1goupgfShEEA63ZYywUXSw/SxIFA4lZYywUXRqTcArjZsoSY4Kum+ef9V7ytl1p5Ygx16V5JxgTdN27/JJ3FF2iIOaSPDuMCboe7JzzEuXH9y8VLQrGNWSDMQ10caeVLgpWF7R2jrFQdGF9ECSr1VgougjCQiJ2My1TNVIiuc8t6hjTQJdvaoUBzw2LPqKoY0wDXb6plaZsbYoMga8oqhgLRZfvwLVht3ZyM7YoKhjTQJdPaqVNsEZOKkUwGiKKCsY00OWTWmlT/UuVRwsVBbt76QV/jIWiyye1wvyTcwlAQxQwBn2cMSbogoEhDQoxSrHVJTbeKPMXf5OCV4zlsoYo2P3tNXeMCbpwNd8DMzguFyyDO2/RUMXhvPnH9fg+ojC3cRyfEjLTghPGBF1MTF2kVpoKSly4DYXz5p/YouDVpje6lpCdMKaBLgbYdS6xoat64S7BZSxR8My6fgDXTpjWGNNAl29qhYFmMKXrJaSGHkMUvHXe4iUaxjTQFTuwa5pw53lYbknLRoxtnn7y8VB0YV0MiG0+4S7Noezs2gljYgwNrI9fh6Cry5wUc5HUOChC5VJy9umEOQ4qK94C10LRlSLazrGfrGmJXzUrwrTQpdmpWLK5dMGY3fv/w5cGukruWtG0NrUg02hwPPKSPXV0ld61ksJLaid5QRcW4iUxYoO+e8nxY3qjfeuqK/SZ+L50rXTlJWTgxRlO7JQk6Ap9Jr6krvocvESWwdfWlv+yBowaz8SzNh/y6svFS+jJrvcSJXT1oZm7Sy+Zm/PSQlcOjQ2leInZRLH9yjNvnRBFXCjGM/ElPpPShZewsdvRiuvAvlHB4SQjT2jF2GdlnjAsDPAoEnjkzEoNPF2fYZGUitVLpKglO0iERvPzgkoGnDuK+YaLqJZxS41xXL1EUiqMeatqY0xhcuzjSuklrTpZcCURJqTXK3UmABzK5gjS3SIdLtIYnspLpBkPLzm7/MRj7bpYDGG62lxNy0sYINcaubnLhYgHXtuK5+olRkrFrW21a2E0vATvcC0qud44Ih7FNJ8NdszEY2svsW2Kg/FjuXqJj3ekMqOyuBe8WxFBTkjraqwgM7Z3aO8NVluDz1UYlyCzJO9Q9RJbGiZWcGkK04SykrzDTKmoP4zKpNSVMBJk9sE7qimVE+l5bWFibydY7dEtzTusiccYr/tAmNjpmGpdplTvOJFS0faSrvNkfTJJqbAZavR9v8x3piwGf76X1KbnY+1qNMS97l1TKrXp+Sg7GyXIk5ViklLpzEvqhIkZXGoOlrzSiYxtrHOeJR7XlneT7FMswsSO+kNSHGyxKJOuzfgbA0nJgu8inm95XFIqTun5mJu05SQMSJWtN0xjeYrJw1FNhlj8Dt7FbzYlaGsfaUi53XrsqL+p45C7XQK249cBjg5AiS0ZyKJF3lPJzdVWMI6BYIiAYIjlVcTqozAcB+RI5/rMIw4HhkEOyTf5CpbdO7ukO4a7KKYY3JWCisqA7EcP1moEOxJtPxsvseXJtKN+JlHwVJ20OR54ym4w+ioMeGKClWWmOU9whwYXjYYnzH/89dn1m4kTQS2T9l4XeOrtx8yTtYn662IKvI54aIGnDoWxxRTTZezhJLrAU2RhzODSFlPwHfBU3PvfS/2Y6ZhqTMEycoGnxMI0RdmLTwKUZf9O98SffwGNUzQNXB4PKgAAAC10RVh0U29mdHdhcmUAYnkuYmxvb2RkeS5jcnlwdG8uaW1hZ2UuUE5HMjRFbmNvZGVyqAZ/7gAAAABJRU5ErkJggg==',
                    graph: new Image(),
                    live: 1000
                }
            }
        }
        
    }

    enemy: {
        img: string;
        graph: HTMLImageElement;
        live: number
    };
    p_scale= 0.5

    constructor(canvas: HTMLCanvasElement){
        super();
        this.x = Math.round(Math.random() * canvas.width/2);
        this.y = Math.round(Math.random() * canvas.height)*-1;
        this.p_scale = Math.random()+0.5
        let src = this.enemy_graphs.meteors[0].big.img;
        this.enemy_graphs.meteors[0].big.graph.src = src;
        this.enemy = this.enemy_graphs.meteors[0].big
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        ctx.drawImage(
            this.enemy.graph,
            this.x,
            this.y,
            this.enemy.graph.width*this.p_scale,
            this.enemy.graph.height*this.p_scale
        );
    }
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        this.y +=0.2*delta_time;
        if(this.y > canvas.height+50){
            this.x = Math.round(Math.random() * canvas.width/2);
            this.y = Math.round(Math.random() * canvas.height)*-1;
        }
    }

    distance(entity){
        return this.getDistance(entity);
    }

    reduceLive(live: number){
        this.enemy.live -= live;
    }

    shoot(callback){}
    destroy(callback){
        if(this.enemy.live <= 0){
            callback(true);
        }
    }
}