
import { Player } from "../player";
import { Entity } from "./Entity.class";
import { GameComponent } from "./Entity.interface";

export class PlayerDecorator extends Entity implements GameComponent {
    protected decoratedPlayer: Player;
    constructor(player: Player) {
        super();
        this.decoratedPlayer = player;
    }

    public isInvulnerable(): boolean {
        return (this.decoratedPlayer as any).isInvulnerable ? (this.decoratedPlayer as any).isInvulnerable() : false;
    }

    public setInvulnerable(duration?: number) {
        if ((this.decoratedPlayer as any).setInvulnerable) {
            (this.decoratedPlayer as any).setInvulnerable(duration);
        }
    }

    public get onHitFeedback() {
        return (this.decoratedPlayer as any).onHitFeedback;
    }

    public set onHitFeedback(callback) {
        (this.decoratedPlayer as any).onHitFeedback = callback;
    }

    public get controlsEnabled(): boolean {
        return (this.decoratedPlayer as any).controlsEnabled;
    }

    public set controlsEnabled(enabled: boolean) {
        (this.decoratedPlayer as any).controlsEnabled = enabled;
    }

    public draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.decoratedPlayer.draw(delta_time, ctx, canvas);
    };
    public shoot(callback) {
        this.decoratedPlayer.shoot(val => {
            callback(val);
        });
    };
    public update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.decoratedPlayer.update(delta_time, ctx, canvas);
    }

    public destroy(callback) {
        this.decoratedPlayer.destroy(val => {
            callback(val);
        });
    }

    public distance(entity: Entity): number {
        return this.decoratedPlayer.distance(entity);
    };

    public reduceLive(live: number) {
        this.decoratedPlayer.reduceLive(live);
    };

    public restoreLive() {
        this.decoratedPlayer.restoreLive();
    }

    public getPosition() {
        return this.decoratedPlayer.getPosition();
    }

    public getCenter(): { x: number; y: number } {
        return (this.decoratedPlayer as any).getCenter ? (this.decoratedPlayer as any).getCenter() : this.decoratedPlayer.getPosition();
    }

    public getCollisionRadius(): number {
        return (this.decoratedPlayer as any).getCollisionRadius ? (this.decoratedPlayer as any).getCollisionRadius() : 22;
    }
}

export class ShieldPlayer extends PlayerDecorator {

    shield = {
        graph: new Image(),
        graphs: [
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAABsCAYAAABEkXF2AAAFKElEQVR42u2drZPbMBDFA0pKSkoKSkpKSgJCQkxMRO5vzh9z+MjNzX2S3nqkG1uRbclfsbS/N2OWOLb0vPv2aa0cDsrw+Pj4M/U4gLxxf3//XSby5eXlz/v7+/HzOH98fNSfx90CRy3nk/PK+eV35PcY9R2SwBLgtODkTyHLSa4DktwwBcjTekMSxJDkSOrZgAhvb2//Pgfc7JQIfYeR64YgC+FyuXyTkLzjiJAcQeR+5L6Y3QlksOnBFEKGq+gh9wc5IslgU8SdlkPuF3L0kOH19fXvGoNuS8iznF+Op6enXykehXzefdeda43rlPNDDovn5+ffC6UJ4yZfJnPtAZbzy+84six1DzIeasnw8PDww3oLs6KACDc5117uyQrjauZ9nfZyT5vBDtzkActBwbvKaU66ke+rcB8nPkVNrZ+rWyjXPaOaqop1SSX/ThiUqqQcK9HDaqhU38UUZ36lpgsJuaU7gPYhqdWlE3kyEtNFJSWgJn0l95sYQatsS9dEQhgVomoAiT5NfsSQciqW/VJNYNp0BGlsmW6yKVsTCFGrq8XTDL26CGLEEkKEJNFhPP1Gehz7JUakhmj8BqY8HpELhPvTGLGEIF2sWqHshxiRhKhIF4rGOUItQ4gNiSHzcWtCHEcu8MhUKhr3MesaQtyWGJubgda3328I00OMwdS92fqRzWsGDZGFxjCbzMWIoQIhdkYMma9VL2Bk0QZC3JYY9VBT8Co/bC3s3jDFO5S3xdgSwyrG4VCIwqncB0YKgGqztKG6JX2HGLIKFksjttnW9L3dxDRkVaouk+YHTJKK4c9PeM42FQdyFMIyD+G5vKnV50mgI/JAnxac7F30RYnVzRCwSdU4KVr0RAnSRiFpJPnh7osS2tvwc0VfS19StOipOGqGN+tqxEyuRKwvccUqbW9ulYY+UytKDoRCDeKyGNFZTzIgQ19ku78yYF8ySpMFIYFJlCg/Wgw+9CGBSZQoP1oMCk5foRIlio0WfiViolMHdrYe3yKYEQIfNAxfmQjZDsEqxPfI6ZUoPoVUg60Q1vGixU4RQmZWp/HavtWMpa0IoUDQca39dXdShw74bXudHk5/mZzUoTOFdCwIr26l6lCCQK+FCeYWXg5WV4XUV2LTN61opNGtKxoTy/fC0RO6dUXjYvuVB8OkC36maCqQ9sooC2BqdUV3xbRdjuJPqCVF1QkMbVIgMhGbDSnaLKGhRic8XVkdqDyAX4EcqDyAX4FACtBPCspRylJIASAFgBQAUoClSVFDCtDpz3U2N6SAFFdrH5ACUrRJcYIUoLN07hZDIAWk+GqyaS+GMDQ60e7qbton2r43w6MTbQ407RPtN5AZHkjxtTEa/RS6EZQQriyl80ongsWG27CEHk2dcLZEp3HbvRC02h+Qgb2T4ny1FYETm3gVuj2Kq9137cIYb5wrQ6v6rEMh5Hi1xQ0oHm4Xo+CLYE5XsDG7LrgiIzjvbp8KXh3UKTLHShP+RVAJXCAY3KjGpRB0hS49MbizsmMO2y+rSR1SXJjRICAfnP2HpiAXf6KO0pB2xcyQQsqG66GIXgQVBpFCyi9FkxxsIQRbJ5afOpIffPkSf0xbdNWRvv+6LKOzalps1XGeLA8wssqDXQCb/i8NwiYEZ3kCc/ac0mNRDqw5OT/6i29BtCgDohEX68Nl5bQMLbGoUy0nJFrkryUWd6mltsX6zhNiZa/WPEW0yBOrzptEClzOvCDCcvUIL6QgjeRTgm72EBMt8qk4pnzvP5BNdvyZ+zIYAAAALXRFWHRTb2Z0d2FyZQBieS5ibG9vZGR5LmNyeXB0by5pbWFnZS5QTkcyNEVuY29kZXKoBn/uAAAAAElFTkSuQmCC',
            ''
        ],
        resistance: 0,
    };

    shieldFlashTimer = 0;
    private level = 0;

    constructor(player: Player) {
        super(player);
        this.shield.graph.src = this.shield.graphs[this.level];
    }

    public update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.decoratedPlayer.update(delta_time, ctx, canvas);
        if (this.shieldFlashTimer > 0) {
            this.shieldFlashTimer = Math.max(0, this.shieldFlashTimer - delta_time);
        }
    }

    public draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        if (this.shield.resistance > 0) this.drawShield(ctx);
        this.decoratedPlayer.draw(delta_time, ctx, canvas);

        // Styled Shield HUD below health bar
        if (this.shield.resistance > 0) {
            ctx.save();
            const isMobileScreen = canvas.width < 600;
            const barX = 12;
            const barY = isMobileScreen ? 27 : 32;
            const barW = isMobileScreen ? Math.min(100, Math.max(70, Math.floor(canvas.width * 0.22))) : 140;
            const barH = isMobileScreen ? 8 : 10;
            const isFlash = this.shieldFlashTimer > 0;

            ctx.fillStyle = 'rgba(10, 20, 35, 0.75)';
            ctx.strokeStyle = isFlash ? '#ffffff' : 'rgba(0, 229, 255, 0.6)';
            ctx.lineWidth = isFlash ? 2 : 1;
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeRect(barX, barY, barW, barH);

            const curShield = Math.max(0, Math.min(100, this.shield.resistance));
            const fillW = (curShield / 100) * (barW - 4);
            if (fillW > 0) {
                ctx.fillStyle = isFlash ? '#ffffff' : '#00e5ff';
                ctx.shadowColor = '#00e5ff';
                ctx.shadowBlur = isFlash ? 14 : 6;
                ctx.fillRect(barX + 2, barY + 2, fillW, barH - 4);
            }

            ctx.fillStyle = '#80d8ff';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.font = isMobileScreen ? 'bold 8px Arial' : 'bold 9px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(isMobileScreen ? `SH ${Math.ceil(this.shield.resistance)}` : `SHIELD: ${Math.ceil(this.shield.resistance)}`, barX + barW + 5, barY + barH - 2);
            ctx.restore();
        }
    }

    private drawShield(ctx: CanvasRenderingContext2D) {
        ctx.save();
        const isFlash = this.shieldFlashTimer > 0;
        if (isFlash) {
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 30;
            if (ctx.filter) {
                ctx.filter = 'brightness(2.5) drop-shadow(0 0 12px #00e5ff)';
            }
        } else {
            ctx.shadowColor = 'rgba(0, 229, 255, 0.45)';
            ctx.shadowBlur = 10;
        }

        ctx.drawImage(
            this.shield.graph,
            Math.floor(this.decoratedPlayer.x - this.shield.graph.width / 4),
            Math.floor(this.decoratedPlayer.y) - 130,
            this.shield.graph.width,
            this.shield.graph.height
        );
        ctx.restore();
    }

    public reduceLive(damage: number) {
        if (this.isInvulnerable()) {
            return;
        }

        if (this.shield.resistance > 0) {
            this.shieldFlashTimer = 220;
            this.setInvulnerable(450); // Grace period to prevent instant wipeout

            if (this.onHitFeedback) {
                this.onHitFeedback('shield', damage, this.decoratedPlayer.x, this.decoratedPlayer.y);
            }

            this.shield.resistance -= damage;
            if (this.shield.resistance <= 0) {
                const overflow = Math.abs(this.shield.resistance);
                this.shield.resistance = 0;
                if (overflow > 0) {
                    this.decoratedPlayer.reduceLive(overflow);
                }
            }
        } else {
            this.decoratedPlayer.reduceLive(damage);
        }
    }

    public activateShield(range: number) {
        this.shield.resistance = range;
    }
}
