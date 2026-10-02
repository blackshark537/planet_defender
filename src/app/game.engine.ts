import { Background } from './bg';
import { Player } from './player';
import { MeteorEnemy } from './meteor.enemy';
import { powerType, PowerUp } from './powerup';
import { PowerUpPool } from './powerup.pool';
import { ShieldPlayer } from './models/Playe.decorator';
import { ShootFactory } from './shoot.factory';
import { Shoot } from './shoot';
import { EnemyPool } from './enemy.pool';
import {
  FloatingText,
  Shockwave,
  STORAGE_KEY_RECORD,
  STORAGE_KEY_BEST_STAGE,
  COMBO_WINDOW,
  getStageAsteroidGoal,
  isInsideRect
} from './game.types';
import { SoundService } from './sound.service';
import { WeaponManager } from './weapon.manager';
import { BombManager } from './bomb.manager';
import { GameUIRenderer } from './game-ui.renderer';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId = 0;

  // Subsystems & Managers
  readonly sound = new SoundService();
  readonly weapon = new WeaponManager();
  readonly bomb = new BombManager();
  readonly ui = new GameUIRenderer();

  // Entities & Pools
  private playerInstance: Player;
  private shieldedPlayer: ShieldPlayer;
  private game_elements = new Map<string, any>();
  private shootFactory = new ShootFactory();
  private enemyPool: EnemyPool;
  private particlePool: EnemyPool;
  private powerUpPool = new PowerUpPool(10, 30);
  private bg: Background;

  private enemies = new Map<string, MeteorEnemy>();
  private particles = new Map<string, MeteorEnemy>();
  private powerUps = new Map<string, PowerUp>();
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];

  // Game States
  gameover = false;
  private gameOverAt = 0;
  private canRestart = () => performance.now() - this.gameOverAt > 700;

  score = 0;
  combo = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  maxComboThisRun = 0;

  currentLevel = 1;
  currentStage = 1;
  stageAsteroidsDestroyed = 0;
  totalAsteroidsDestroyed = 0;
  stagesCompleted = 0;
  stageAsteroidGoal = getStageAsteroidGoal(1);

  bestAsteroidsRecord = 0;
  bestStageRecord = 1;
  runStartRecord = 0;

  inWelcomeScreen = true;
  showingHowToPlay = false;
  isPaused = false;

  private levelBannerTimer = 2500;
  private levelBannerText = 'STAGE 1';
  private enemyPauseTimer = 0;
  private sectorClearedBannerTimer = 0;
  private sectorClearedText = '';

  private screenShakeTimer = 0;
  private screenShakeIntensity = 0;
  private screenFlashTimer = 0;
  private screenFlashMaxTime = 250;
  private screenFlashColor = 'rgba(255, 20, 20, ALPHA)';

  private lastCall = 0;
  private dtAcc = 0;
  private dtEnemyCreator = 0;
  private canEnemyCreator = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    this.playerInstance = new Player(canvas);
    this.playerInstance.controlsEnabled = false;
    this.shieldedPlayer = new ShieldPlayer(this.playerInstance);
    this.game_elements.set('player', this.shieldedPlayer);

    this.enemyPool = new EnemyPool(canvas, 20, 60);
    this.particlePool = new EnemyPool(canvas, 30, 80);
    this.bg = new Background(canvas);

    this.loadRecordsFromStorage();
    this.setupPlayerHitFeedback();
  }

  private loadRecordsFromStorage(): void {
    try {
      const savedRec = localStorage.getItem(STORAGE_KEY_RECORD);
      if (savedRec) this.bestAsteroidsRecord = parseInt(savedRec, 10) || 0;
      const savedSt = localStorage.getItem(STORAGE_KEY_BEST_STAGE);
      if (savedSt) this.bestStageRecord = parseInt(savedSt, 10) || 1;
    } catch (e) {}
  }

  private updateRecords(): void {
    if (this.totalAsteroidsDestroyed > this.bestAsteroidsRecord) {
      this.bestAsteroidsRecord = this.totalAsteroidsDestroyed;
    }
    if (this.currentStage > this.bestStageRecord) {
      this.bestStageRecord = this.currentStage;
    }
  }

  private saveRecordsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_RECORD, this.bestAsteroidsRecord.toString());
      localStorage.setItem(STORAGE_KEY_BEST_STAGE, this.bestStageRecord.toString());
    } catch (e) {}
  }

  private setupPlayerHitFeedback(): void {
    this.shieldedPlayer.onHitFeedback = (type: 'hull' | 'shield', damage: number, px: number, py: number) => {
      this.screenShakeTimer = type === 'hull' ? 280 : 160;
      this.screenShakeIntensity = type === 'hull' ? 10 : 5;

      this.screenFlashTimer = type === 'hull' ? 260 : 180;
      this.screenFlashMaxTime = this.screenFlashTimer;
      this.screenFlashColor = type === 'hull' ? 'rgba(255, 25, 25, ALPHA)' : 'rgba(0, 229, 255, ALPHA)';

      this.sound.playPlayerHitSound(type === 'shield');

      this.shockwaves.push({
        x: px + 30,
        y: py - 70,
        radius: 10,
        maxRadius: type === 'hull' ? 95 : 75,
        color: type === 'shield' ? '#00e5ff' : '#ff1744',
        alpha: 0.9,
        life: 280,
        maxLife: 280
      });

      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 40 + Math.random() * 60;
        const particle = this.particlePool.acquire(
          {
            x: px + 30,
            y: py - 70,
            targetX: px + 30 + Math.cos(angle) * dist,
            targetY: py - 70 + Math.sin(angle) * dist
          },
          Math.random() - 0.5,
          true
        );
        this.particles.set(particle.id, particle);
      }

      this.floatingTexts.push({
        text: type === 'shield' ? `SHIELD -${damage}` : `-${damage} HP`,
        x: px + 30,
        y: py - 110,
        color: type === 'shield' ? '#00e5ff' : '#ff1744',
        shadowColor: type === 'shield' ? '#00b0ff' : '#d50000',
        alpha: 1.0,
        life: 750,
        maxLife: 750,
        vy: -1.2
      });

      if (type === 'hull') {
        if (this.combo >= 3) {
          this.floatingTexts.push({
            text: 'COMBO BROKEN!',
            x: px + 30,
            y: py - 135,
            color: '#ff5252',
            shadowColor: '#d50000',
            alpha: 1.0,
            life: 800,
            maxLife: 800,
            vy: -1.0
          });
        }
        this.combo = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;

        const lostSpecial = this.weapon.popActiveSpecial();
        if (lostSpecial) {
          this.floatingTexts.push({
            text: `${lostSpecial.toUpperCase()} LOST!`,
            x: px + 30,
            y: py - 155,
            color: '#ff9100',
            shadowColor: '#e65100',
            alpha: 1.0,
            life: 900,
            maxLife: 900,
            vy: -1.2
          });
        }
      }
    };
  }

  private registerKill(basePoints: number, ex: number, ey: number, isGiant: boolean = false): void {
    this.combo++;
    this.comboTimer = COMBO_WINDOW;
    this.comboMultiplier = Math.min(8, 1 + Math.floor(this.combo / 4));
    if (this.combo > this.maxComboThisRun) this.maxComboThisRun = this.combo;

    const pts = basePoints * this.comboMultiplier;
    this.score += pts;

    this.floatingTexts.push({
      text: this.comboMultiplier > 1 ? `+${pts} (x${this.comboMultiplier})` : `+${pts}`,
      x: ex,
      y: ey - 15,
      color: this.comboMultiplier >= 6 ? '#ff1744' : (this.comboMultiplier >= 4 ? '#ff9100' : (this.comboMultiplier >= 2 ? '#ffd700' : '#ffffff')),
      shadowColor: this.comboMultiplier >= 4 ? '#ff3d00' : '#ffab00',
      alpha: 1.0,
      life: 650,
      maxLife: 650,
      vy: -1.3
    });
  }

  triggerDetonateBomb(): void {
    if (this.inWelcomeScreen || this.isPaused || this.gameover) return;
    this.bomb.detonate(this.enemies, this.playerInstance, this.shockwaves, this.canvas, () => {
      this.screenShakeTimer = 350;
      this.screenShakeIntensity = 8;
      this.sound.triggerHaptic([60, 40, 90]);
      this.sound.playBombSound();
    });
  }

  togglePause(): void {
    if (this.gameover) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.playerInstance.shooter = false;
      this.sound.playPauseSound();
      this.saveRecordsToStorage();
    } else {
      this.lastCall = performance.now();
      this.sound.playResumeSound();
    }
  }

  private advanceStage(): void {
    this.stagesCompleted++;
    this.currentStage++;
    this.currentLevel = this.currentStage;
    this.stageAsteroidsDestroyed = 0;
    this.stageAsteroidGoal = getStageAsteroidGoal(this.currentStage);
    this.updateRecords();

    this.bomb.addStageBonus(pos => {
      this.floatingTexts.push({
        text: '+ 💣 STAGE BONUS!',
        x: pos.x + 30,
        y: pos.y - 110,
        color: '#ffab00',
        shadowColor: '#ff6d00',
        alpha: 1,
        life: 1100,
        maxLife: 1100,
        vy: -1.2
      });
    }, this.shieldedPlayer.getPosition());

    this.bg.level = ((this.currentStage - 1) % 14) + 1;
    this.bg.planet_img.src = `assets/Planet${this.bg.level}.png`;
    this.bg.y = -350;
    this.bg.planetActive = true;
    this.bg.isTransitioning = false;

    this.enemyPauseTimer = 4500;
    this.sectorClearedBannerTimer = 3500;
    this.sectorClearedText = `STAGE ${this.stagesCompleted} COMPLETED!`;
    this.levelBannerTimer = 3500;
    this.levelBannerText = `STAGE ${this.currentStage}`;

    this.sound.playStageClearedSound();
  }

  restartGame(): void {
    this.gameover = false;
    this.isPaused = false;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.maxComboThisRun = 0;
    this.currentStage = 1;
    this.currentLevel = 1;
    this.stageAsteroidsDestroyed = 0;
    this.totalAsteroidsDestroyed = 0;
    this.stagesCompleted = 0;
    this.stageAsteroidGoal = getStageAsteroidGoal(1);
    this.enemyPauseTimer = 0;
    this.sectorClearedBannerTimer = 0;
    this.levelBannerTimer = 2500;
    this.levelBannerText = 'STAGE 1';

    this.runStartRecord = this.bestAsteroidsRecord;

    this.bomb.reset();
    this.weapon.reset();

    this.playerInstance.restoreLive();
    this.playerInstance.x = this.canvas.width / 2 - 45;
    this.playerInstance.y = this.canvas.height - 150;
    this.playerInstance.targeX_pos = this.playerInstance.x;
    this.playerInstance.targeY_pos = this.playerInstance.y;
    this.playerInstance.setInvulnerable(1500);
    this.playerInstance.shooter = false;
    this.playerInstance.controlsEnabled = true;

    this.shieldedPlayer.activateShield(0);
    this.game_elements.set('player', this.shieldedPlayer);

    this.enemies.forEach(enemy => this.enemyPool.release(enemy));
    this.enemies.clear();

    this.particles.forEach(p => this.particlePool.release(p));
    this.particles.clear();

    this.powerUps.forEach(pu => this.powerUpPool.release(pu));
    this.powerUps.clear();

    this.game_elements.forEach((el, key) => {
      if (key !== 'player') {
        this.shootFactory.release(el);
        this.game_elements.delete(key);
      }
    });

    this.bg.level = 1;
    this.bg.planet_img.src = 'assets/Planet1.png';
    this.bg.y = -350;
    this.bg.planetActive = true;
    this.bg.isTransitioning = false;

    this.lastCall = performance.now();
  }

  startGame(): void {
    this.inWelcomeScreen = false;
    this.showingHowToPlay = false;
    this.playerInstance.controlsEnabled = true;
    this.restartGame();
    this.sound.playResumeSound();
    this.sound.triggerHaptic(40);
    this.sound.playBGM();
  }

  goToWelcomeScreen(): void {
    this.inWelcomeScreen = true;
    this.showingHowToPlay = false;
    this.gameover = false;
    this.isPaused = false;
    this.playerInstance.controlsEnabled = false;
    this.playerInstance.shooter = false;
    this.saveRecordsToStorage();

    this.enemies.forEach(enemy => this.enemyPool.release(enemy));
    this.enemies.clear();

    this.particles.forEach(p => this.particlePool.release(p));
    this.particles.clear();

    this.powerUps.forEach(pu => this.powerUpPool.release(pu));
    this.powerUps.clear();

    this.game_elements.forEach((el, key) => {
      if (key !== 'player') {
        this.shootFactory.release(el);
        this.game_elements.delete(key);
      }
    });

    this.sound.playPauseSound();
    this.sound.triggerHaptic(30);
  }

  start(): void {
    this.rafId = requestAnimationFrame(time => this.loop(time));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private draw(dt: number): void {
    let shakeApplied = false;
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= dt;
      const curMagnitude = this.screenShakeIntensity * Math.max(0, this.screenShakeTimer / 280);
      this.ctx.save();
      this.ctx.translate((Math.random() - 0.5) * 2 * curMagnitude, (Math.random() - 0.5) * 2 * curMagnitude);
      shakeApplied = true;
    }

    this.bg.draw(dt, this.ctx, this.canvas);
    this.bg.update(dt, this.ctx, this.canvas);
    this.ui.drawSectorHUD(this.ctx, this.canvas, this.currentLevel, this.enemyPauseTimer, this.bg);

    if (this.sectorClearedBannerTimer > 0) {
      this.sectorClearedBannerTimer -= dt;
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#00e676';
      this.ctx.shadowColor = '#00e676';
      this.ctx.shadowBlur = 8;
      this.ctx.font = 'bold 36px Arial';
      this.ctx.fillText(this.sectorClearedText, this.canvas.width / 2, this.canvas.height / 2 - 130);
      this.ctx.font = '16px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText('SAFE ZONE - REST & RECHARGE', this.canvas.width / 2, this.canvas.height / 2 - 90);
      this.ctx.restore();
    }

    if (this.levelBannerTimer > 0) {
      this.levelBannerTimer -= dt;
      this.ctx.save();
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#00e5ff';
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = 8;
      this.ctx.font = 'bold 38px Arial';
      this.ctx.fillText(this.levelBannerText, this.canvas.width / 2, this.canvas.height / 2 - 130 + (this.sectorClearedBannerTimer > 0 ? 110 : 0));
      this.ctx.restore();
    }

    this.powerUps.forEach(powerUp => {
      powerUp.update(dt, this.ctx, this.canvas);
      powerUp.draw(dt, this.ctx, this.canvas);
    });

    this.enemies.forEach(enemy => {
      enemy.update(dt, this.ctx, this.canvas);
      enemy.draw(dt, this.ctx, this.canvas);
    });

    this.particles.forEach(p => {
      p.update(dt, this.ctx, this.canvas);
      p.draw(dt, this.ctx, this.canvas);
    });

    this.game_elements.forEach(el => {
      el.update(dt, this.ctx, this.canvas);
      el.draw(dt, this.ctx, this.canvas);
    });

    this.ui.drawShockwaves(this.ctx, dt, this.shockwaves);
    this.ui.drawFloatingTexts(this.ctx, dt, this.floatingTexts);

    if (shakeApplied) this.ctx.restore();

    if (this.screenFlashTimer > 0) {
      this.screenFlashTimer -= dt;
      const alpha = Math.max(0, this.screenFlashTimer / this.screenFlashMaxTime) * 0.45;
      const grad = this.ctx.createRadialGradient(
        this.canvas.width / 2,
        this.canvas.height / 2,
        this.canvas.height * 0.25,
        this.canvas.width / 2,
        this.canvas.height / 2,
        this.canvas.height * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, this.screenFlashColor.replace('ALPHA', alpha.toFixed(3)));
      this.ctx.save();
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }

    if (this.bomb.bombFlashTimer > 0) {
      this.bomb.update(dt);
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, this.bomb.bombFlashTimer / 350) * 0.7})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }

    if (this.gameover) {
      this.ui.drawGameOverScreen(this.ctx, this.canvas, {
        bestAsteroidsRecord: this.bestAsteroidsRecord,
        runStartRecord: this.runStartRecord,
        currentStage: this.currentStage,
        totalAsteroidsDestroyed: this.totalAsteroidsDestroyed,
        maxComboThisRun: this.maxComboThisRun,
        stageAsteroidsDestroyed: this.stageAsteroidsDestroyed,
        stageAsteroidGoal: this.stageAsteroidGoal,
        stagesCompleted: this.stagesCompleted,
        score: this.score
      });
    } else {
      const hudBottomY = this.ui.drawWeaponStackHUD(
        this.ctx,
        this.canvas,
        this.weapon.getStack(),
        sp => this.weapon.getAmmo(sp),
        this.score,
        this.bestAsteroidsRecord,
        this.shieldedPlayer.shield.resistance > 0
      );

      this.ui.drawStageObjectiveHUD(this.ctx, this.canvas, this.currentStage, this.stageAsteroidsDestroyed, this.stageAsteroidGoal);
      this.ui.drawComboHUD(this.ctx, this.canvas, this.combo, this.comboMultiplier, this.comboTimer, hudBottomY + 4);
      this.ui.drawPauseButton(this.ctx, this.canvas);
      this.ui.drawBombButton(this.ctx, this.canvas, this.bomb.bombs, this.bomb.bombCharge);
    }
  }

  private loop(time: number): void {
    const rawDt = this.lastCall ? Math.min(time - this.lastCall, 50) : 16;
    this.lastCall = time;

    if (this.inWelcomeScreen) {
      this.bg.draw(rawDt, this.ctx, this.canvas);
      this.bg.update(rawDt, this.ctx, this.canvas);
      this.ui.drawWelcomeScreen(this.ctx, this.canvas, this.bestAsteroidsRecord, this.bestStageRecord);
      if (this.showingHowToPlay) {
        this.ui.drawHowToPlayModal(this.ctx, this.canvas);
      }
      this.rafId = requestAnimationFrame(t => this.loop(t));
      return;
    }

    if (this.isPaused) {
      this.ui.drawPauseScreen(this.ctx, this.canvas, {
        currentStage: this.currentStage,
        stageAsteroidsDestroyed: this.stageAsteroidsDestroyed,
        stageAsteroidGoal: this.stageAsteroidGoal,
        bestAsteroidsRecord: this.bestAsteroidsRecord,
        totalAsteroidsDestroyed: this.totalAsteroidsDestroyed
      });
      this.rafId = requestAnimationFrame(t => this.loop(t));
      return;
    }

    if (this.gameover) {
      this.draw(rawDt);
      this.rafId = requestAnimationFrame(t => this.loop(t));
      return;
    }

    const dt = rawDt;
    this.dtAcc += dt;
    this.dtEnemyCreator += dt;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
      }
    }

    if (this.enemyPauseTimer > 0) {
      this.enemyPauseTimer -= dt;
      this.dtEnemyCreator = 0;
      this.canEnemyCreator = false;
    } else {
      this.canEnemyCreator = true;
    }

    this.draw(dt);

    const spawnCooldown = Math.max(850, 2200 - (this.currentLevel - 1) * 110);
    if (this.enemyPauseTimer <= 0 && this.dtEnemyCreator > spawnCooldown && this.canEnemyCreator) {
      const minEnemies = Math.min(6, 3 + Math.floor((this.currentLevel - 1) / 3));
      const extraEnemies = Math.min(4, 2 + Math.floor((this.currentLevel - 1) / 4));
      const count = Math.floor(Math.random() * (extraEnemies + 1)) + minEnemies;

      for (let i = 0; i < count; i++) {
        const enemy = this.enemyPool.acquire(undefined, undefined, false, undefined, this.currentLevel);
        this.enemies.set(enemy.id, enemy);
      }
      this.dtEnemyCreator = 0;
      this.canEnemyCreator = false;
    }

    this.game_elements.forEach(el => {
      el.destroy((val: any) => {
        if (val) {
          if (val === 'player') {
            this.gameover = true;
            this.gameOverAt = performance.now();
            this.saveRecordsToStorage();
          } else {
            this.shootFactory.release(val);
          }
          this.game_elements.delete(val);
        }
      });

      el.shoot((val: any) => {
        if (val && this.dtAcc >= 250) {
          const volley = [...this.shootFactory.getShoot('basic', val)];
          const sp = this.weapon.activeSpecial();
          if (sp) {
            volley.push(...this.shootFactory.getShoot(sp, val));
            this.weapon.consumeSpecialAmmo();
          }
          volley.forEach(s => this.game_elements.set(s.id, s));
          this.dtAcc = 0;
        }
      });
    });

    this.enemies.forEach((enemy, key) => {
      const enemyPos = enemy.getPosition();
      if (!enemyPos) return;

      // Radio aproximado del enemigo circular
      const enemyRadius = (enemy as any).getCollisionRadius
        ? (enemy as any).getCollisionRadius()
        : (Math.min(enemy.enemy.graph.width, enemy.enemy.graph.height) * enemy.scale * 0.45);

      this.game_elements.forEach((el, elkey) => {
        const dist = el.distance(enemy);

        if (dist == null) return;

        // Radio del elemento atacante/jugador
        let elementRadius = 20;
        if ((el as any).getCollisionRadius) {
          elementRadius = (el as any).getCollisionRadius();
        } else {
          const graph = (el as any)?.enemy?.graph;
          if (graph) {
            elementRadius =
              (Math.min(graph.width, graph.height) * ((el as any).scale || 1)) / 2;
          }
        }

        const collisionDistance = enemyRadius + elementRadius;

        if (dist > collisionDistance) return;

        if (elkey === 'player') {
          const playerEl = el as any;

          if (playerEl.isInvulnerable?.()) return;

          el.reduceLive(20);
          enemy.reduceLive(200);

          return;
        }

        const shoot = el as Shoot;

        // Un disparo no puede golpear al mismo enemigo más de una vez
        if (shoot.hasHit?.(key)) return;

        shoot.registerHit?.(key);

        enemy.reduceLive(shoot.damage || 100);

        shoot.reduceLive(shoot.piercing ? 50 : 100);
      });

      if (enemyPos.y > this.canvas.height) {
        enemy.hasPowerUp = false;
        this.enemyPool.release(enemy);
        this.enemies.delete(key);
        this.canEnemyCreator = true;
        return;
      }

      enemy.destroy(res => {
        const val = res as { onDestroy: boolean; onPowerUp: boolean; powerUpType: powerType; isGiant?: boolean };
        if (val?.onDestroy) {
          this.sound.playEnemyExplosionSound(val.isGiant || false, val.onPowerUp, this.comboMultiplier);

          this.stageAsteroidsDestroyed++;
          this.totalAsteroidsDestroyed++;
          this.updateRecords();

          if (performance.now() - this.bomb.lastBombAt > 400) {
            this.bomb.addKillCharge(pos => {
              this.floatingTexts.push({
                text: '+ 💣',
                x: pos.x + 30,
                y: pos.y - 90,
                color: '#ffab00',
                shadowColor: '#ff6d00',
                alpha: 1,
                life: 900,
                maxLife: 900,
                vy: -1
              });
              this.sound.triggerHaptic([20, 30, 20]);
            }, this.shieldedPlayer.getPosition());
          }

          if (val?.onPowerUp) {
            const dropType = this.weapon.getWeightedPowerUpType();
            const p = this.powerUpPool.acquire(enemyPos.x, enemyPos.y, dropType);
            this.powerUps.set(p.id, p);
            val.onPowerUp = false;
          }

          const { x: ex, y: ey } = enemyPos;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 200 + Math.random() * 250;
            const particle = this.particlePool.acquire(
              {
                x: ex,
                y: ey,
                targetX: ex + Math.cos(angle) * dist,
                targetY: ey + Math.sin(angle) * dist
              },
              Math.random() - 0.5,
              true
            );
            this.particles.set(particle.id, particle);
          }

          this.registerKill(val.isGiant ? 15 : 5, ex, ey, val.isGiant);
          this.enemyPool.release(enemy);
          this.enemies.delete(key);
          this.canEnemyCreator = true;

          if (this.stageAsteroidsDestroyed >= this.stageAsteroidGoal) {
            this.advanceStage();
          }
        }
      });
    });

    const playerEl = this.game_elements.get('player');
    const playerPos = playerEl ? playerEl.getPosition() : null;

    this.powerUps.forEach((powerUp, key) => {
      if (playerPos && powerUp.isCollidingWithPlayer(playerPos.x, playerPos.y)) {
        powerUp.collect();
      }

      powerUp.destroy(res => {
        if (res?.onDestroy) {
          if (res.collected && playerEl) {
            this.weapon.applyPowerUp(res.powerUpType, playerEl, () => (this.score += 100));

            let label = `+${res.powerUpType.toUpperCase()}!`;
            if (res.powerUpType === powerType.DOUBLE || res.powerUpType === powerType.TRIPLE || res.powerUpType === powerType.LASER) {
              label = `+${res.powerUpType.toUpperCase()} (${this.weapon.getAmmo(res.powerUpType as any)})`;
            } else if (res.powerUpType === powerType.BASIC) {
              label = '+100 PTS';
            }

            this.floatingTexts.push({
              text: label,
              x: powerUp.x,
              y: powerUp.y - 20,
              color: res.powerUpType === powerType.SHIELD ? '#00e5ff' : '#69f0ae',
              shadowColor: '#00e5ff',
              alpha: 1.0,
              life: 700,
              maxLife: 700,
              vy: -1.3
            });
          }
          this.powerUpPool.release(powerUp);
          this.powerUps.delete(key);
        }
      });
    });

    this.particles.forEach((p, pKey) => {
      p.destroy(val => {
        if (val) {
          this.particlePool.release(p as MeteorEnemy);
          this.particles.delete(pKey);
        }
      });
    });

    this.rafId = requestAnimationFrame(t => this.loop(t));
  }

  handleActionClick(x: number, y: number): void {
    if (this.inWelcomeScreen) {
      if (this.showingHowToPlay) {
        if (isInsideRect(x, y, this.ui.howToPlayDeployBtnRect)) {
          this.startGame();
        } else {
          this.showingHowToPlay = false;
          this.sound.playPauseSound();
        }
        return;
      }

      if (isInsideRect(x, y, this.ui.welcomeStartBtnRect)) {
        this.startGame();
        return;
      }

      if (isInsideRect(x, y, this.ui.welcomeHowToPlayBtnRect)) {
        this.showingHowToPlay = true;
        this.sound.playResumeSound();
        return;
      }
      return;
    }

    if (this.isPaused) {
      if (isInsideRect(x, y, this.ui.pauseQuitBtnRect)) {
        this.goToWelcomeScreen();
        return;
      }
      this.togglePause();
      return;
    }

    if (this.gameover) {
      if (!this.canRestart()) return;
      if (isInsideRect(x, y, this.ui.gameOverMainMenuBtnRect)) {
        this.goToWelcomeScreen();
        return;
      }
      this.startGame();
      return;
    }

    if (this.ui.isTouchPauseButton(x, y)) {
      this.togglePause();
    }
  }

  handlePointerDown(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * (this.canvas.width / (rect.width || 1));
    const py = (clientY - rect.top) * (this.canvas.height / (rect.height || 1));
    if (this.ui.isTouchBombButton(px, py)) {
      this.triggerDetonateBomb();
    }
  }

  handlePointerUp(clientX: number, clientY: number, wasDrag: boolean): void {
    if (wasDrag) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || 1);
    const scaleY = this.canvas.height / (rect.height || 1);
    this.handleActionClick((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  }

  handleKeyDown(code: string, repeat: boolean): void {
    if (this.inWelcomeScreen) {
      if (this.showingHowToPlay) {
        if (code === 'Escape' || code === 'Space' || code === 'Enter') {
          this.showingHowToPlay = false;
        }
        return;
      }
      if (code === 'Enter' || code === 'Space') {
        this.startGame();
        return;
      }
      if (code === 'KeyH') {
        this.showingHowToPlay = true;
        return;
      }
      return;
    }

    if (code === 'KeyP' || code === 'Escape') {
      this.togglePause();
      return;
    }

    if (code === 'KeyB' && !repeat) {
      this.triggerDetonateBomb();
      return;
    }

    if (this.isPaused && (code === 'KeyM' || code === 'KeyQ')) {
      this.goToWelcomeScreen();
      return;
    }

    if (this.gameover) {
      if (!this.canRestart()) return;
      if (code === 'Space' || code === 'Enter') {
        this.startGame();
        return;
      }
      if (code === 'Escape' || code === 'KeyM') {
        this.goToWelcomeScreen();
        return;
      }
    }
  }
}
