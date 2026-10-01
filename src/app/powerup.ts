import { Entity } from "./models/Entity.class";
import { GameComponent } from "./models/Entity.interface";

export enum powerType {
    SHIELD = 'shield',
    PILL = 'pill',
    BASIC = 'basic',
    TRIPLE = 'triple',
    LASER = 'laser',
    DOUBLE = 'double'
}

export class PowerUp extends Entity implements GameComponent {
    static powerUpData: Record<powerType, { imgSrc: string[]; width: number; height: number }> = {
        [powerType.PILL]: {
            imgSrc: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAVCAYAAABCIB6VAAABjklEQVR42q3UvUrDUBQH8LxBH0HwBTKmaYU+gpObevFj8QOro4O4OgiCaI1SKNpJHEpBsZghOjQmLSWQyUUMhkKXEsgLXHOiJyZ6k+aKF/5LcvPL6c05FQSOpet6xTCMhmmaWiytIET46woePur3+zQt8BJVVQu8KIGHB4MBdRyHjkajKMPhkFqWFeLwa7hRCCC+7//KeDwOX/pV+T4X6rouE8XAfdjX6/W8f0MxuB8+MhNdrBVJ/e6QC43D3W53iokuXZQpRHnezY16nhfBmejGfZHumBK9fNnLBeMZQ9sx0eV6iW4+fKKYSThUG2u5KhPdepQSKKb9epKK2raN1VoRulCTK5NQzNP7TSaamDyiyC2A19pyJvoTz0Rh4cfa1qVcMERzriMUBoLZXgjnRaGA1asSbXZOQzSoVmQOA0/FiMJ+clb2mh1FTB1dPGPs27zo/PGMmPmfgK220iilVs2NRlWfyxa23PptsnIYFrjOjcKaO5gu4JGkhShljQtNHIsizWL136D8Flyv8lofL9l+llqAyicAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII='],
            width: 22,
            height: 21
        },
        [powerType.SHIELD]: {
            imgSrc: [
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAACqElEQVR42r1X3WoTURA+b+Aj+Ag+gk8gguid6IWC3qgF6UVBKShKsTarophiMULTdhNPElsrwdCYP2OTaNwS0apF9A18hHW/SWZzNsku6/HEgbnYPbNn5nzfnJlZkbCfH7fsXOVetuBOWy1b/kxs5CwBsTbyv/+HU1WXVu0jgh9Kn7665S8HU9XVcr1/8kxuXlgZ6eAh3+pO3XFyq0iOQa8A5nhANFj8kE25v66eNKYH8+dpXyDK6C4sLx8S8I4HRAODRqNm1HEveZv2BaJ9mKVDyQXvHAlD8mPutDHHnRc27blebfZh5qymzPbSHC833++R0f7irDHHtXaH9nzyqjTkd+g4l8JLRAWjj+nHRvmFBvhlSazLs3iJqGDULL82yi+QDPDLcjedPoyFB3KTDCtOzyi/mfruOL+jPG93e2T87dYlY/w+Le6M86vwXMAiooNxdyXhfp85oa3718/5/ALJMX59nm15BYuIDsY1uea2Lx7T1rf3b9A+QHAivywo3DB4VNimD9602v/kuL62QvvIZiecXx/uQacq7n2mj3Znz2g7rpb6lfBZqRLOr8Iz9WVEiY8Al65j5hcIhvLrO/baldowdHl+d3Mm0BhC+R0WkuxRtWHo8txILgYaQyS/LKODgQ7PQEpt/JH8jvLMg0H1Zd5tXT4V22nzzpxbdnqBxh/J76T7zKcG5OAtyiGC4ysUWZ/DBNHxtUJGcgmlISH1cHIyXbvgVmpV3457L8HsNSARV9A0eBZTyyhB791PlXdKpAG0uP8ML4JHsgod4XmMW6Y/iXqOcMfBPweEnOCajDyJxWs0597AP4AeG/OUwopguDr5o6spQR1XoecCA/4D0Ma5Nn8rlHSDEYkTb3hK6SAvxDQFWar+9sSqSqYEp0PG0j+QpvwBVSpvfevc5jIAAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII='
            ],
            width: 30,
            height: 30
        },
        [powerType.DOUBLE]: {
            imgSrc: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB0ElEQVR42mNgoADM8LHRnxVgPX92gPV+IH0eSs+f5Wtrz0BrMMPXyn9OkO1/XBjkONpZDjR8doDNe5BF+5I8/p/P8oPjnQnuYAeAQqTDRYmfppZvjXP9/6A4BANvjHGBOWI+3S0H4et5gWAHgNTS3XIYhqWFAbGcqiFAquUgDFIHTgNBNuthOQaUNUnOnjMDLeLJtRyaCO+jZ0+QeSBzibIcpokcy2F4RYTj/7VRTmC8JMwe7jC8WZRaloPKCHR1IDFYOUFTy/HphYUEKG3Q3XLkUJgdYFVPd8uxOgDZ8jVRzv/PAct0QhhW3CJjYvUuDXOApANQtpziZSWPbMDJDF+CGKQOm+Wk6AXlBLDvQYUFSGBVhBPdLEdJgLCC5nCqN0ED1ke7UMVylIIIJkjIgB3x7tS3HNkB+EKAZpYjp4FNsa70txzsAGBWgClCdwSIT1PLkR0BKpvxNTJJsRw51Iiq+UAAVDuB2nDIFkKa3JBcQo7lKEUtOQDkKJBBC0PsSbacKg1SWNsfVwKlqeWQQsqqnhgH0MRy5EpqCbDyoLvlsDQAS4Qgi+hqObaGKajCAkUHCIPYNLccLYueJ7uFS93QsKoH4Vl+NvmgtgSlZgIAtfurcCLeQI4AAAAtdEVYdFNvZnR3YXJlAGJ5LmJsb29kZHkuY3J5cHRvLmltYWdlLlBORzI0RW5jb2RlcqgGf+4AAAAASUVORK5CYII='],
            width: 32,
            height: 32
        },
        [powerType.TRIPLE]: {
            imgSrc: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAhCAYAAAC803lsAAAB8ElEQVR42mNgQAN16ur+ddra/fXa2vthuEFb+z+5GNmcOg2N+lo1NX0GfACkoF5T8zwllpLiuGpFRXkMR5QLCvIDJd/DFE4wMPg/z8Tk/0JTUzBeY2lJNoaZATIPZC6SY95jhA4wJNaDJDt0df8vMzenyGJCGGQ+yB6wY4AxgBIlIMEmIF5pYUFTR8AwyJ4maMgA0008JHECEyZIYJqREV0cAcMg+6Chsh4WLeAESusowRZFsLQCdggs8dDTETAMs3vQOASUayl2yP0tWwY+RECOAAFyHUMVh5xubv6PDEB8ujtkd1zcf2wAJE4Xh4B8/ers2f/4AEie2NAh2SFX58z5//PTp/+kAJB6kD6qOgQ9PRALLvT3Uz9qYDmEWACKIpqkkY2urv/f37xJdLRsCwykXWI9WlZGlENurVhB21xzICuLKIcQSqQUOwRX+UFqIqVKgUYMAIUcXRzy9OBBsK9hCRJEg7I4SByUUOnikGHdHhlQh4Aa0CgOgbVZKe2/kNPfQelS1GtpzQcJTDY0pKtDQPaBHQK0H97XhfVr6NWSB9kD79cA7Uf09KAdbVAPjNadLJD58J4e0F7MDji07wty6WxjY6o7CGQeyNwmfH1fpI74fnqNBoC7EPgAKM5A3UDk0QEqWf4elDBR0gQSAADqRzdNXphXpgAAAC10RVh0U29mdHdhcmUAYnkuYmxvb2RkeS5jcnlwdG8uaW1hZ2UuUE5HMjRFbmNvZGVyqAZ/7gAAAABJRU5ErkJggg=='],
            width: 34,
            height: 33
        },
        [powerType.LASER]: {
            imgSrc: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAhCAYAAAC803lsAAAB5klEQVR42mNgQAMh3br+od0G/aE9xvthOLzP+D+5GNmckF6D+sAObX0GfACkILTH6DwllpLiOK8WTXkMR7iUK/GH9hq+hylMWGLyP2Ob6f+sXWZgXHjSnGwMMwNkHshcuGOA9mGEDjAk1oMko2ca/889SJnFhDDIfJA9kJAxOo8SJSDBiInG//OP0tYRMAyyB2QfyN7gHoN4SGgAEyZIIGW1KV0cAcMg+6Chsh4WLeAESusowRZFsLQCdggs8dDTETAMs3vQOASUa4duiEy5lvkfH7j98Sx9HLLsbhNeh4AcSheH7HgymyqhQVOHkBIaFDvk5KstVAkNih0CspAaoUETh3z7/en/3Jul9HUIyFJc4O2PZ+BcRReHgCzDBUCO7L4cQ78iHuRrbFFESmhQta5BLtxAuWnAKj1YmQKKrsozzgPnEFj0kJIuaOIQUOJc/6BvYNsjTecD/l96d2DgG0agkpScdIHcgEZxCKzNSmn/hZz+DkqXIqzbaD5IIGm5CV0dArIPZC/IfnhfF9avoVdLHmQPrF8Dsh+ppwfpaIN6YLTuZIHMR/T0jPdjdsChfV+QS9M3mVLdQSDzQObCQgJr3xfeEadwCIKU0QBwFwIfAI+PALuByKMDVLEcaB4oYaKkCSQAAA2XIKv50YBWAAAALXRFWHRTb2Z0d2FyZQBieS5ibG9vZGR5LmNyeXB0by5pbWFnZS5QTkcyNEVuY29kZXKoBn/uAAAAAElFTkSuQmCC'],
            width: 34,
            height: 33
        },
        [powerType.BASIC]: {
            imgSrc: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAhCAYAAAC803lsAAAB50lEQVR42mNgQAPijRv9RZs29Ys3b9wPwxItW/6Ti5HNEWveXC9Wu1afAR8AKRBr2nieEktJcZxk9Vp5TFeUr+IXa9r0HqZQecaZ/zorH/zXW/sEjM12fyUbw8wAmQcyF2YHyD6M0AEKrgdJyvYd+G+05Q1FFhPCIPNB9kAcs/E8SpSABCXbd/w32f6Bpo6AYZA9IPtA9oo2bowHOwSUMEEC6vOv0MURMAyyDxpF66HRAkmgtI4SbFEESytgh8ASDz0dAcMwuwePQ4C5duiGSMaZ7//xgTPv/tDHIY1XfuB1CMihdHHIrLu/qBIaNHUIKaFBsUM2P/1NldCg2CEgC6kRGjRxyKdf//6XXPhBX4eALMUFnn77C85VdHEIyDJcAOTI6OPf6FfEg3yNLYpICQ2q1jXIhRsoNw1YpQcrU0DR5bR/AGtfWPSQki5o4hBQ4uy98XNg2yP+h7/9P/Dy98A3jEAlKTnpArkBjeIQWJuV0v4LOf0dlC4FsPE6HySgOucCXR0Csg/aeJ4P7+vC+jX0asmD7IH1a0D2Izre0I42qAdG604WyHxYTw9kL5YOOKTvC3Kp1rI7VHcQyDyQubCQwNr3hXXEKR2CIGU0ANyFwAdAcQbqBiKPDlADg0MAmDBR0gQSAAA0paVDNbQPtAAAAC10RVh0U29mdHdhcmUAYnkuYmxvb2RkeS5jcnlwdG8uaW1hZ2UuUE5HMjRFbmNvZGVyqAZ/7gAAAABJRU5ErkJggg=='],
            width: 34,
            height: 33
        }
    };

    private static imageCache: { [key in powerType]?: HTMLImageElement } = {};

    static getImage(pow: powerType): HTMLImageElement {
        if (!PowerUp.imageCache[pow]) {
            const img = new Image();
            img.src = PowerUp.powerUpData[pow].imgSrc[0];
            PowerUp.imageCache[pow] = img;
        }
        return PowerUp.imageCache[pow]!;
    }

    static generateId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    id: string;
    type: powerType;
    active: boolean = false;
    collected: boolean = false;
    timer: number = 0;
    scale: number = 1.5;
    graph: HTMLImageElement;

    // Backward-compatibility alias
    get enemy(): { graph: HTMLImageElement } {
        return { graph: this.graph };
    }

    constructor(x: number, y: number, pow: powerType) {
        super();
        this.reset(x, y, pow);
    }

    reset(x: number, y: number, pow: powerType, id?: string): void {
        this.id = id || this.id || PowerUp.generateId();
        this.type = pow;
        this.x = x;
        this.y = y;
        this.live = 100;
        this.timer = 0;
        this.collected = false;
        this.active = true;
        this.scale = 1.5;

        // Gentle downward drift with slight horizontal sway
        this.targeX_pos = x + (Math.random() - 0.5) * 80;
        this.targeY_pos = y + 500;

        // Set base ammo for power-up weapons
        if (pow === powerType.DOUBLE) {
            this.ammo = 50;
        } else if (pow === powerType.TRIPLE) {
            this.ammo = 35;
        } else {
            this.ammo = Infinity;
        }

        this.graph = PowerUp.getImage(pow);
    }

    getGlowColor(): string {
        switch (this.type) {
            case powerType.SHIELD:
                return '#00e5ff';
            case powerType.PILL:
                return '#00e676';
            case powerType.LASER:
                return '#ff1744';
            case powerType.DOUBLE:
                return '#ffea00';
            case powerType.TRIPLE:
                return '#ff9100';
            case powerType.BASIC:
            default:
                return '#ffffff';
        }
    }

    draw(dt: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.graph) return;
        const w = (this.graph.width || 32) * this.scale;
        const h = (this.graph.height || 32) * this.scale;

        ctx.save();
        const pulse = Math.sin(this.timer * 0.006) * 3;
        ctx.shadowColor = this.getGlowColor();
        ctx.shadowBlur = 12 + pulse;

        ctx.drawImage(
            this.graph,
            Math.floor(this.x),
            Math.floor(this.y + pulse),
            w,
            h
        );
        ctx.restore();
    }

    update(dt: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        this.timer += dt;
        // Smooth downward drift through space with gentle sinusoidal floating
        this.y += dt * 0.09;
        this.x += Math.sin(this.timer * 0.003) * 0.6;

        if (
            this.x < -60 || this.x > canvas.width + 60 ||
            this.y > canvas.height + 60 ||
            this.timer > 10000
        ) {
            this.live = 0;
        }
    }

    isCollidingWithPlayer(playerX: number, playerY: number): boolean {
        // Player ship center is approximately (playerX + 30, playerY - 75)
        // Power-up center is approximately (this.x + 24, this.y + 24)
        const dx = (playerX + 30) - (this.x + 24);
        const dy = (playerY - 75) - (this.y + 24);
        return (dx * dx + dy * dy) <= (55 * 55);
    }

    ammo: number = Infinity;

    collect(): void {
        this.collected = true;
        this.live = 0;
    }

    shoot(callback: any): void {}

    destroy(callback: (res?: { onDestroy: boolean; collected: boolean; powerUpType: powerType; ammo: number }) => void): void {
        if (this.live <= 0 || this.collected) {
            callback({
                onDestroy: true,
                collected: this.collected,
                powerUpType: this.type,
                ammo: this.ammo
            });
        }
    }

    distance(entity: Entity): number {
        return this.getDistance(entity);
    }

    restoreLive(): void {}

    pos(): { x: number; y: number } {
        return {
            x: this.x,
            y: this.y
        };
    }

    reduceLive(live: number): void {
        this.live = 0;
    }
}