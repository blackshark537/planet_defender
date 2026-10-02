import { Component, OnInit, OnDestroy } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { GameEngine } from './game.engine';

const { StatusBar } = Plugins;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'SpaceShip';
  mobile = false;
  private cleanups: Array<() => void> = [];
  private game!: GameEngine;

  private listen(target: EventTarget, type: string, fn: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) {
    target.addEventListener(type, fn, options);
    this.cleanups.push(() => target.removeEventListener(type, fn, options));
  }

  ngOnDestroy() {
    if (this.game) {
      this.game.destroy();
    }
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
  }

  constructor() {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.mobile = isTouch || isMobileUA;

    try {
      if (typeof StatusBar !== 'undefined') {
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        StatusBar.hide().catch(() => {});
      }
    } catch (e) {}
  }

  ngOnInit() {
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.imageSmoothingEnabled = false;
    };
    resizeCanvas();
    this.listen(window, 'resize', resizeCanvas);
    this.listen(window, 'orientationchange', () => setTimeout(resizeCanvas, 120));

    canvas.style.imageRendering = 'pixelated';
    ctx.imageSmoothingEnabled = false;

    this.game = new GameEngine(canvas);

    // Audio gesture triggers
    this.listen(window, 'mousedown', () => this.game.sound.resumeAudio(), { once: false });
    this.listen(window, 'keydown', () => this.game.sound.resumeAudio(), { once: false });
    this.listen(window, 'touchstart', () => this.game.sound.resumeAudio(), { once: false });

    // Interaction Listeners (Mouse click, Pointer tap & Keyboard)
    let downX = 0;
    let downY = 0;
    this.listen(canvas, 'pointerdown', (e: Event) => {
      const pe = e as PointerEvent;
      downX = pe.clientX;
      downY = pe.clientY;
      this.game.handlePointerDown(pe.clientX, pe.clientY);
    });

    this.listen(canvas, 'pointerup', (e: Event) => {
      const pe = e as PointerEvent;
      const wasDrag = Math.hypot(pe.clientX - downX, pe.clientY - downY) > 12;
      this.game.handlePointerUp(pe.clientX, pe.clientY, wasDrag);
    });

    this.listen(window, 'keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      this.game.handleKeyDown(ke.code, ke.repeat);
    });

    this.listen(document, 'visibilitychange', () => {
      if (document.hidden && !this.game.inWelcomeScreen && !this.game.gameover && !this.game.isPaused) {
        this.game.togglePause();
      }
    });

    this.game.start();
  }
}
