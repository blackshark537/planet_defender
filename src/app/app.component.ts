import { Component, OnInit } from '@angular/core';
import { Background } from './bg';
import { Player } from './player';
import { Shoot } from './shoot';
import { Plugins } from '@capacitor/core';
import { Enemy } from './enemy';
import { EntityInterface } from './models/Entity.interface';

const { StatusBar } = Plugins;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  title = 'SpaceShip';

  constructor() {
    /* StatusBar.setOverlaysWebView({
      overlay: true
    });
    StatusBar.hide(); */
  }

  ngOnInit() {
    let canvas: any = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 10;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.textAlign = 'center';

    let lastCall = 0;
    let dtAcc = 0;
    let dtEnemyCreator=0;

    let game_elements = new Map();
    game_elements.set('player', new Player(canvas));

    let enemies = new Map();
    let id = getId();
    enemies.set(id, new Enemy(canvas));
    let bg = new Background(canvas);
    let gameover = false;

    function loop(time) {
      const dt = (time - lastCall);
      lastCall = time;
      dtAcc += dt;
      dtEnemyCreator +=dt;

      bg.draw(dt, ctx, canvas);
      bg.update(dt, ctx, canvas);

      if(dtEnemyCreator>5000){
        dtEnemyCreator=0;
        for (let i = 2; i > 0; --i) {
          let id = getId();
          enemies.set(id, new Enemy(canvas));
        }
      }

      game_elements.forEach((element, elkey) => {
        
        const el = element as EntityInterface;

        enemies.forEach((enemy, key) => {
          enemy.draw(dt, ctx, canvas);
          
          enemy.update(dt, ctx, canvas);

          const dist = el.distance(enemy);
          if (dist != null && dist <= enemy.enemy.graph.width * enemy.p_scale - 20) {
            enemy.reduceLive(100);
            if(elkey == 'player'){
              el.reduceLive(5);
            } else {
              el.reduceLive(100);
            }
          }

          if(enemy.pos().y > canvas.height){
            el.reduceLive(1000);
          }

          enemy.destroy(val => {
            if(val){
              enemies.delete(key);
            }
          });
        });

        el.draw(dt, ctx, canvas);
        el.update(dt, ctx, canvas);
        el.destroy(val => {
          game_elements.delete(val);
          if (val == 'player') {
            gameover = true;
          }
        });

        el.shoot(val => {
          let id = getId();
          if (dtAcc >= 250) {
            game_elements.set(id, new Shoot(val.x, val.y - 40, id));
            dtAcc = 0;
          }
        });
    });
    if (gameover) {
      showText({
        text: `Game Over`,
        ctx,
        x: canvas.width / 2,
        y: canvas.height / 2
      });
      bg.destroy(()=>{});
    }

    requestAnimationFrame(loop);
  }

    function showText(conf: { text: string, x: number, y: number, ctx: CanvasRenderingContext2D }) {
      conf.ctx.fillStyle = "#fff"
      conf.ctx.font = "30px Arial";
      conf.ctx.fillText(conf.text, conf.x, conf.y);
    }

    function getId(): string {
      let x = 'ABCDEFGHIJKLMNOPQRSTUVXYWZabcdefghijklmnopqrstuvwxyz0123456789';
      let id = ''
      for (let i = 0; i < 5; i++) {
        id += x[Math.round(Math.random() * x.length - 1)];
      }
      return id;
    }

    loop(lastCall);

  }

}
