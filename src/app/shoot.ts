import { Entity } from "./models/Entity.class";
import { EntityInterface } from "./models/Entity.interface";

export class Shoot extends Entity implements EntityInterface{
    img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAA2CAYAAAAVvbNoAAACdklEQVR42nXVT0gUYRjH8adTlyDo1CWCOikSqDuCUUQHDxEdPBQEdSiI6OAhoiiKivBQEBiRENHBQ0SIBwPXnd0UKwsNLY0tTLYw0bA098/8352ZfXpf7EcPwbzwYeH7vuz78s4sS6RGQ7q4M5W1elLZytg/Vo/uep529Re3tmXtgpFzwv/prucpZVpXDdPykuh5as1Zi6mcVdZu5T13uhiGl2ZdB03Pk9p/FZacKArjOpeCOJad2kxnGfyoziA7qcMtgB3WGWRXBy/PQ6mqtvpLdnUmOw9rQZ1Bdn0FH2DFjxlkJyNrT8KSGzPIrrYrv4YFJ2aQXX/TKBTsmEF2as1aGZirxAyyq4PbzyFfjhhk11cwADOliEF29VjspzC1HjHIrg7u9MHE74hBdnVw+xGMr0UMsutFvTD2K2SQnTbe7Q0jP0MG2dUVOHfAXAkZZNdX0A1DP0IG2ckw7eswuBwyyK4fy2UYWKoxyE6tpnMBni3WGGTXV9AFT77XGGSn5ox1FvoWagyyU3PWOg2Pv9UYZCcj45yAh1+rDLJTi2kfgweFKoPsZAxbnXBvvsogu7qCymG4+6XKILv+tXTA7bkqg+xqO/sAdH8OGGRXb6a1F25+Chhkp+Z0OQXX8gGD7NSUKe6BKx8DBtmpZchugIuzAYPs1DRc3g3nZ3wG2ckYXN8BXe99BtmpMb26Hc5N+wyyU3t/ZRucmfIZZKfG/tUtcOqdzyA70f3CZjg56THIrv9eNsHxCY9BdpLj6FuPgZJG5xuPIXHRkXGPIXHRoVcuQ+KijpcuQ+Kig2MuQ+KifSNWaf+oy1riorYX9o32EZf1p+x/AKpjl6rTKgNOAAAALXRFWHRTb2Z0d2FyZQBieS5ibG9vZGR5LmNyeXB0by5pbWFnZS5QTkcyNEVuY29kZXKoBn/uAAAAAElFTkSuQmCC';
    s_img: HTMLImageElement;
    id;
    live = 100;

    constructor(x, y, id){
        super();
        this.s_img  = new Image();
        this.s_img.src  = this.img;
        this.x  = x;
        this.y  = y;
        this.id = id;
    }

    draw(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        ctx.drawImage(
            this.s_img, 
            this.x+25,
            this.y,
            this.s_img.width, 
            this.s_img.height
        );
    }
    
    update(delta_time: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
        this.y-= 0.8* delta_time;
    }

    distance(enemy): number{
      return this.getDistance(enemy);
    }

    shoot(callback){};

    destroy(callback){
        if(this.y < -100 || this.live <= 0) callback(this.id);
    }

    reduceLive(live: number){
        this.live -= live;
    }

}