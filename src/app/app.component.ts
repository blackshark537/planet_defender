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
export class AppComponent implements OnInit{
  
  title = 'SpaceShip';

  constructor(){
    /* StatusBar.setOverlaysWebView({
      overlay: true
    });
    StatusBar.hide(); */
  }

  ngOnInit(){  
    let canvas: any = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight-10;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.textAlign = 'center';

    let lastCall = 0;
    let dtAcc = 0;

    let game_elements = new Map();
    game_elements.set('player', new Player(canvas));
    
    let enemies: Enemy[] = [];
    enemies.push(new Enemy(canvas));
    let bg = new Background(canvas);
    let gameover = false;

    function loop(time){
      const dt = (time-lastCall);
      lastCall = time;
      dtAcc+=dt;
      
      bg.draw(dt, ctx, canvas);
      bg.update(dt, ctx, canvas);

      enemies.forEach(enemy =>{
        enemy.draw(dt, ctx, canvas);
        enemy.update(dt, ctx, canvas);
        enemy.destroy(val =>{
          enemies.push(new Enemy(canvas));
          enemies.shift();
        })
      });
      game_elements.forEach((element, key)=>{
        const el = element as EntityInterface;
        el.draw(dt, ctx, canvas);
        el.update(dt, ctx, canvas);
        el.destroy(val => {
          game_elements.delete(val);
          if(val == 'player'){
            gameover = true;
          }
        });

        const dist = el.distance(enemies[0]);
        if(dist != null && dist <= enemies[0].enemy.graph.width*enemies[0].p_scale-20){
          enemies[0].reduceLive(100);
          el.reduceLive(100);
        }
        el.shoot(val => {
          let id = getId();
          if(dtAcc >= 250){
            game_elements.set(id, new Shoot(val.x, val.y-40, id));
            dtAcc=0;
          }
        });
      });
        
      if(gameover){
        showText({
          text: `Game Over`, 
          ctx,
          x: canvas.width/2,
          y: canvas.height/2
        });
      }
      
      requestAnimationFrame(loop);
    }

    function showText(conf:{ text: string, x: number, y:number, ctx: CanvasRenderingContext2D}){
      conf.ctx.fillStyle="#fff"
      conf.ctx.font = "30px Arial";
      conf.ctx.fillText(conf.text, conf.x, conf.y);
    }

    function getId(): string{
      let x = 'ABCDEFGHIJKLMNOPQRSTUVXYWZabcdefghijklmnopqrstuvwxyz0123456789';
      let id = ''
      for (let i = 0; i < 5; i++) {
           id += x[Math.round(Math.random()*x.length-1)];
      }
      return id;
    }

    loop(lastCall);
    
  }

}
