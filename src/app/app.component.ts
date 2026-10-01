import { Component, OnInit } from '@angular/core';
import { Background } from './bg';
import { Player } from './player';
import { Plugins } from '@capacitor/core';
import { MeteorEnemy } from './meteor.enemy';
import { powerType, PowerUp } from './powerup';
import { PowerUpPool } from './powerup.pool';
import { ShieldPlayer } from './models/Playe.decorator';
import { ShootFactory } from './shoot.factory';
import { Shoot } from './shoot';
import { EnemyPool } from './enemy.pool';
const { StatusBar } = Plugins;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  title = 'SpaceShip';
  mobile = false;

  constructor() {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.mobile = isTouch || isMobileUA;

    try {
      if (typeof StatusBar !== 'undefined') {
        StatusBar.setOverlaysWebView({
          overlay: true
        }).catch(() => {});
        StatusBar.hide().catch(() => {});
      }
    } catch (e) {}
  }

  ngOnInit() {
    let canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.imageSmoothingEnabled = false;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 120));

    canvas.style.imageRendering = "pixelated";
    ctx.imageSmoothingEnabled = false;

    const bg_audio = new Audio();
    const shoot_audio = new Audio();
    const explotion_audio = new Audio();
    bg_audio.src = '/assets/through_space.ogg';
    bg_audio.volume = 0.3;
    shoot_audio.src = '/assets/sfx_laser1.ogg';
    shoot_audio.volume = 0.1;
    explotion_audio.src = '/assets/explosion.wav';
    explotion_audio.volume = 0.5;

    //setTimeout(()=>bg_audio.play(), 1000);

    let gameover = false;
    let score = 0;
    let lastCall = 0;
    let dtAcc = 0;
    let dtEnemyCreator = 0;
    let canEnemyCreator = true;
    let dtDraw = 0;
    let dtAudioShoot = 0;
    let dtAudioExp = 0;
    let playerGun = 0; // Starts with basic weapon
    const gunType = ['basic', 'laser', 'double', 'triple'];
    let currentWeaponType: powerType = powerType.BASIC;
    let playerAmmo: number = Infinity; // Basic has unlimited ammo
    let currentLevel = 1;
    let currentStage = 1;
    let stageAsteroidsDestroyed = 0;
    let totalAsteroidsDestroyed = 0;
    let stagesCompleted = 0;
    function getStageAsteroidGoal(stage: number): number {
      return 15 + (stage - 1) * 5;
    }
    let stageAsteroidGoal = getStageAsteroidGoal(currentStage);

    const STORAGE_KEY_RECORD = 'spaceship_record_asteroids';
    const STORAGE_KEY_BEST_STAGE = 'spaceship_record_best_stage';
    let bestAsteroidsRecord = 0;
    let bestStageRecord = 1;

    try {
      const savedRec = localStorage.getItem(STORAGE_KEY_RECORD);
      if (savedRec) bestAsteroidsRecord = parseInt(savedRec, 10) || 0;
      const savedSt = localStorage.getItem(STORAGE_KEY_BEST_STAGE);
      if (savedSt) bestStageRecord = parseInt(savedSt, 10) || 1;
    } catch (e) {}

    function updateRecords() {
      if (totalAsteroidsDestroyed > bestAsteroidsRecord) {
        bestAsteroidsRecord = totalAsteroidsDestroyed;
        try {
          localStorage.setItem(STORAGE_KEY_RECORD, bestAsteroidsRecord.toString());
        } catch (e) {}
      }
      if (currentStage > bestStageRecord) {
        bestStageRecord = currentStage;
        try {
          localStorage.setItem(STORAGE_KEY_BEST_STAGE, bestStageRecord.toString());
        } catch (e) {}
      }
    }

    let inWelcomeScreen = true;
    let showingHowToPlay = false;

    interface ButtonRect {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    let welcomeStartBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let welcomeHowToPlayBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let howToPlayCloseBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let howToPlayDeployBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let gameOverPlayAgainBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let gameOverMainMenuBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let pauseResumeBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    let pauseQuitBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };

    function isInsideRect(x: number, y: number, r: ButtonRect): boolean {
      return r.w > 0 && r.h > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    let isPaused = false;
    let levelBannerTimer = 2500;
    let levelBannerText = 'STAGE 1';
    let enemyPauseTimer = 0;
    let sectorClearedBannerTimer = 0;
    let sectorClearedText = '';

    let game_elements = new Map();

    const playerInstance = new Player(canvas);
    playerInstance.controlsEnabled = false;
    const shieldedPlayer = new ShieldPlayer(playerInstance);
    game_elements.set('player', shieldedPlayer);
    let shootFactory = new ShootFactory();
    const enemyPool = new EnemyPool(canvas, 20, 60);
    const particlePool = new EnemyPool(canvas, 30, 80);
    const powerUpPool = new PowerUpPool(10, 30);

    // Hit feedback and audio synthesis systems
    let audioCtx: AudioContext | null = null;
    function getAudioContext(): AudioContext | null {
      if (!audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    function triggerHaptic(pattern: number | number[]) {
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(pattern);
        }
      } catch (e) {}
    }

    const resumeAudio = () => {
      getAudioContext();
      if (bg_audio && bg_audio.paused) {
        bg_audio.play().catch(() => {});
      }
    };
    window.addEventListener('mousedown', resumeAudio, { once: false });
    window.addEventListener('keydown', resumeAudio, { once: false });
    window.addEventListener('touchstart', resumeAudio, { once: false });

    function playPlayerHitSound(isShield: boolean = false) {
      triggerHaptic(isShield ? 35 : 70);
      try {
        const aCtx = getAudioContext();
        if (!aCtx) {
          if (explotion_audio) {
            explotion_audio.currentTime = 0;
            explotion_audio.play().catch(() => {});
          }
          return;
        }

        const now = aCtx.currentTime;
        if (isShield) {
          const osc = aCtx.createOscillator();
          const gain = aCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(620, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

          osc.connect(gain);
          gain.connect(aCtx.destination);
          osc.start(now);
          osc.stop(now + 0.21);
        } else {
          const osc = aCtx.createOscillator();
          const gain = aCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(170, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

          const bufferSize = Math.floor(aCtx.sampleRate * 0.18);
          const noiseBuffer = aCtx.createBuffer(1, bufferSize, aCtx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const whiteNoise = aCtx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;
          const noiseGain = aCtx.createGain();
          noiseGain.gain.setValueAtTime(0.3, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

          whiteNoise.connect(noiseGain);
          noiseGain.connect(aCtx.destination);
          whiteNoise.start(now);

          osc.connect(gain);
          gain.connect(aCtx.destination);
          osc.start(now);
          osc.stop(now + 0.3);

          if (explotion_audio) {
            explotion_audio.currentTime = 0;
            explotion_audio.play().catch(() => {});
          }
        }
      } catch (e) {
        playNativeExplosion();
      }
    }

    // Rotating explosion audio pool to allow rapid overlapping explosions
    const explosionAudioPool: HTMLAudioElement[] = [];
    for (let i = 0; i < 6; i++) {
      const audio = new Audio('/assets/explosion.wav');
      audio.volume = 0.45;
      explosionAudioPool.push(audio);
    }
    let explosionPoolIndex = 0;

    function playNativeExplosion() {
      try {
        const audio = explosionAudioPool[explosionPoolIndex % explosionAudioPool.length];
        explosionPoolIndex++;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    let lastEnemyExplosionTime = 0;

    function playEnemyExplosionSound(isGiant: boolean = false, dropsPowerUp: boolean = false) {
      triggerHaptic(isGiant ? 50 : 25);
      const nowMs = performance.now();
      const timeSinceLast = nowMs - lastEnemyExplosionTime;
      lastEnemyExplosionTime = nowMs;

      // 1. Play native audio from rotating pool
      playNativeExplosion();

      // 2. Synthesize procedural explosion & rock debris via Web Audio API
      try {
        const aCtx = getAudioContext();
        if (!aCtx) return;

        const now = aCtx.currentTime;
        const dur = isGiant ? 0.38 : 0.22;
        const startFreq = isGiant ? 95 : (160 + (Math.random() - 0.5) * 30);
        const endFreq = isGiant ? 22 : 38;

        // Bass Impact Oscillator
        const osc = aCtx.createOscillator();
        const oscGain = aCtx.createGain();
        osc.type = isGiant ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

        const volume = isGiant ? 0.45 : (timeSinceLast < 40 ? 0.22 : 0.35);
        oscGain.gain.setValueAtTime(volume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + dur);

        osc.connect(oscGain);
        oscGain.connect(aCtx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);

        // Shattering debris / crunch noise burst
        const bufferSize = Math.floor(aCtx.sampleRate * (isGiant ? 0.26 : 0.16));
        const noiseBuffer = aCtx.createBuffer(1, bufferSize, aCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = aCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = aCtx.createBiquadFilter();
        filter.type = isGiant ? 'lowpass' : 'bandpass';
        filter.frequency.setValueAtTime(isGiant ? 450 : 850, now);
        filter.frequency.exponentialRampToValueAtTime(isGiant ? 120 : 250, now + dur);

        const noiseGain = aCtx.createGain();
        noiseGain.gain.setValueAtTime(isGiant ? 0.35 : 0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + (isGiant ? 0.26 : 0.16));

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(aCtx.destination);
        whiteNoise.start(now);

        // Power-up drop reward chime if loot dropped
        if (dropsPowerUp) {
          const chimeOsc = aCtx.createOscillator();
          const chimeGain = aCtx.createGain();
          chimeOsc.type = 'sine';
          chimeOsc.frequency.setValueAtTime(587.33, now + 0.05); // D5
          chimeOsc.frequency.setValueAtTime(880.00, now + 0.12); // A5

          chimeGain.gain.setValueAtTime(0.01, now);
          chimeGain.gain.setValueAtTime(0.25, now + 0.06);
          chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

          chimeOsc.connect(chimeGain);
          chimeGain.connect(aCtx.destination);
          chimeOsc.start(now + 0.05);
          chimeOsc.stop(now + 0.34);
        }
      } catch (e) {}
    }

    let screenShakeTimer = 0;
    let screenShakeIntensity = 0;
    let screenFlashTimer = 0;
    let screenFlashMaxTime = 250;
    let screenFlashColor = 'rgba(255, 20, 20, ALPHA)';

    interface FloatingText {
      text: string;
      x: number;
      y: number;
      color: string;
      shadowColor: string;
      alpha: number;
      life: number;
      maxLife: number;
      vy: number;
    }
    const floatingTexts: FloatingText[] = [];

    interface Shockwave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      color: string;
      alpha: number;
      life: number;
      maxLife: number;
    }
    const shockwaves: Shockwave[] = [];

    shieldedPlayer.onHitFeedback = (type: 'hull' | 'shield', damage: number, px: number, py: number) => {
      // 1. Kinetic Screen Shake
      screenShakeTimer = type === 'hull' ? 280 : 160;
      screenShakeIntensity = type === 'hull' ? 10 : 5;

      // 2. Peripheral Screen Flash Vignette
      screenFlashTimer = type === 'hull' ? 260 : 180;
      screenFlashMaxTime = screenFlashTimer;
      screenFlashColor = type === 'hull' ? 'rgba(255, 25, 25, ALPHA)' : 'rgba(0, 229, 255, ALPHA)';

      // 3. Audio Feedback
      playPlayerHitSound(type === 'shield');

      // 4. Expanding shockwave ring at collision center
      shockwaves.push({
        x: px + 30,
        y: py - 70,
        radius: 12,
        maxRadius: type === 'hull' ? 70 : 50,
        color: type === 'hull' ? '#ff3d00' : '#00e5ff',
        alpha: 0.9,
        life: 300,
        maxLife: 300
      });

      // 5. Fiery / electric debris particles using particlePool
      const sparkCount = type === 'hull' ? 12 : 7;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200 + 80;
        const targetX = px + 30 + Math.cos(angle) * dist;
        const targetY = (py - 70) + Math.sin(angle) * dist;

        const particle = particlePool.acquire({
          x: px + 30,
          y: py - 70,
          targetX,
          targetY
        }, Math.random() - 0.5, true);

        particles.set(particle.id, particle);
      }

      // 6. Floating Damage Indicator
      floatingTexts.push({
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
    };

    let enemies = new Map<string, MeteorEnemy>();
    let particles = new Map<string, MeteorEnemy>();
    let powerUps = new Map<string, PowerUp>();

    let bg = new Background(canvas);

    // When a planet passes (level/sector completed): pause enemy spawns for 22s so player can rest!
    bg.onPlanetPassed((clearedLevel) => {
      enemyPauseTimer = 22000;
      sectorClearedBannerTimer = 4500;
      sectorClearedText = `SECTOR ${clearedLevel} CLEARED!`;
    });

    // When the 30-second transit ends and new level begins
    bg.onLevelUp((newLevel) => {
      // Deep space planet passage transit completes
      if (enemyPauseTimer <= 0) {
        enemyPauseTimer = 3500;
      }
    });

    function playStageClearedSound() {
      triggerHaptic([40, 50, 70]);
      try {
        const aCtx = getAudioContext();
        if (!aCtx) return;
        const now = aCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = aCtx.createOscillator();
          const gain = aCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.01, now + idx * 0.09);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(aCtx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.36);
        });
      } catch (e) {}
    }

    function playPauseSound() {
      triggerHaptic(20);
      try {
        const aCtx = getAudioContext();
        if (!aCtx) return;
        const now = aCtx.currentTime;
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } catch (e) {}
    }

    function playResumeSound() {
      try {
        const aCtx = getAudioContext();
        if (!aCtx) return;
        const now = aCtx.currentTime;
        const osc = aCtx.createOscillator();
        const gain = aCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(aCtx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } catch (e) {}
    }

    function togglePause() {
      if (gameover) return;
      isPaused = !isPaused;
      if (isPaused) {
        playerInstance.shooter = false;
        playPauseSound();
      } else {
        lastCall = performance.now();
        playResumeSound();
      }
    }

    function advanceStage() {
      stagesCompleted++;
      currentStage++;
      currentLevel = currentStage;
      stageAsteroidsDestroyed = 0;
      stageAsteroidGoal = getStageAsteroidGoal(currentStage);
      updateRecords();

      // Advance planet in background to match new stage
      bg.level = ((currentStage - 1) % 14) + 1;
      bg.planet_img.src = `assets/Planet${bg.level}.png`;
      bg.y = -350;
      bg.planetActive = true;
      bg.isTransitioning = false;

      // Safe pause / rest period for player
      enemyPauseTimer = 4500;
      sectorClearedBannerTimer = 3500;
      sectorClearedText = `STAGE ${stagesCompleted} COMPLETED!`;
      levelBannerTimer = 3500;
      levelBannerText = `STAGE ${currentStage}`;

      playStageClearedSound();
    }

    function restartGame() {
      gameover = false;
      isPaused = false;
      score = 0;
      currentStage = 1;
      currentLevel = 1;
      stageAsteroidsDestroyed = 0;
      totalAsteroidsDestroyed = 0;
      stagesCompleted = 0;
      stageAsteroidGoal = getStageAsteroidGoal(1);
      enemyPauseTimer = 0;
      sectorClearedBannerTimer = 0;
      levelBannerTimer = 2500;
      levelBannerText = 'STAGE 1';

      playerGun = 0;
      currentWeaponType = powerType.BASIC;
      playerAmmo = Infinity;

      playerInstance.restoreLive();
      playerInstance.x = (canvas.width / 2) - 45;
      playerInstance.y = canvas.height - 150;
      playerInstance.targeX_pos = playerInstance.x;
      playerInstance.targeY_pos = playerInstance.y;
      playerInstance.setInvulnerable(1500);
      playerInstance.shooter = false;

      playerInstance.controlsEnabled = true;
      shieldedPlayer.activateShield(0);
      game_elements.set('player', shieldedPlayer);

      // Clean up active enemies, particles, and power-ups
      enemies.forEach((enemy) => {
        enemyPool.release(enemy);
      });
      enemies.clear();

      particles.forEach((p) => {
        particlePool.release(p);
      });
      particles.clear();

      powerUps.forEach((pu) => {
        powerUpPool.release(pu);
      });
      powerUps.clear();

      // Clear non-player projectiles
      game_elements.forEach((el, key) => {
        if (key !== 'player') {
          shootFactory.release(el);
          game_elements.delete(key);
        }
      });

      // Reset background
      bg.level = 1;
      bg.planet_img.src = 'assets/Planet1.png';
      bg.y = -350;
      bg.planetActive = true;
      bg.isTransitioning = false;

      lastCall = performance.now();
    }

    function startGame() {
      inWelcomeScreen = false;
      showingHowToPlay = false;
      playerInstance.controlsEnabled = true;
      restartGame();
      playResumeSound();
      triggerHaptic(40);
      if (bg_audio && bg_audio.paused) {
        bg_audio.play().catch(() => {});
      }
    }

    function goToWelcomeScreen() {
      inWelcomeScreen = true;
      showingHowToPlay = false;
      gameover = false;
      isPaused = false;
      playerInstance.controlsEnabled = false;
      playerInstance.shooter = false;

      // Clean up active enemies, particles, and power-ups
      enemies.forEach((enemy) => {
        enemyPool.release(enemy);
      });
      enemies.clear();

      particles.forEach((p) => {
        particlePool.release(p);
      });
      particles.clear();

      powerUps.forEach((pu) => {
        powerUpPool.release(pu);
      });
      powerUps.clear();

      game_elements.forEach((el, key) => {
        if (key !== 'player') {
          shootFactory.release(el);
          game_elements.delete(key);
        }
      });

      playPauseSound();
      triggerHaptic(30);
    }

    /**
     * 
     * @param time number
     */
    function loop(time) {
      if (inWelcomeScreen) {
        lastCall = time;
        bg.draw(16, ctx, canvas);
        bg.update(16, ctx, canvas);
        drawWelcomeScreen(ctx, canvas);
        if (showingHowToPlay) {
          drawHowToPlayModal(ctx, canvas);
        }
        requestAnimationFrame(loop);
        return;
      }

      if (isPaused) {
        lastCall = time;
        drawPauseScreen(ctx, canvas);
        requestAnimationFrame(loop);
        return;
      }

      if (gameover) {
        lastCall = time;
        draw(16, ctx, canvas);
        requestAnimationFrame(loop);
        return;
      }

      const dt = (time - lastCall);
      lastCall = time;
      dtAcc += dt;
      dtEnemyCreator += dt;
      dtDraw += dt;
      dtAudioShoot += dt;
      dtAudioExp += dt;

      // Track enemy pause timer (safe rest period after completing a sector)
      if (enemyPauseTimer > 0) {
        enemyPauseTimer -= dt;
        dtEnemyCreator = 0;
        canEnemyCreator = false;
      } else {
        canEnemyCreator = true;
      }

      if (dtDraw >= 16) {
        draw(dtDraw, ctx, canvas);
        dtDraw = 0;
      }

      // Enemy creation with difficulty scaling (strictly paused during rest periods)
      const spawnCooldown = Math.max(850, 2200 - (currentLevel - 1) * 110);
      if (enemyPauseTimer <= 0 && dtEnemyCreator > spawnCooldown && canEnemyCreator) {
        const minEnemies = Math.min(6, 3 + Math.floor((currentLevel - 1) / 3));
        const extraEnemies = Math.min(4, 2 + Math.floor((currentLevel - 1) / 4));
        const count = Math.floor(Math.random() * (extraEnemies + 1)) + minEnemies;

        for (let i = 0; i < count; i++) {
          const enemy = enemyPool.acquire(undefined, undefined, false, undefined, currentLevel);
          enemies.set(enemy.id, enemy);
        }
        dtEnemyCreator = 0;
        canEnemyCreator = false;
      }

      game_elements.forEach(el => {
        el.destroy(val => {
          if (val) {
            if (val === 'player') {
              gameover = true;
            } else {
              shootFactory.release(val);
            }
            game_elements.delete(val);
          }
        });

        el.shoot(val => {
          if (val) {
            /* if(dtAudioShoot>350){
              shoot_audio.currentTime=0;
              dtAudioShoot=0;
            } */
            if (dtAcc >= 250) {
              //shoot_audio.play();

              shootFactory.getShoot(gunType[playerGun], val).forEach(shoot => {
                game_elements.set(shoot.id, shoot);
              });
              dtAcc = 0;

              // Consume ammo for limited weapons (double, triple)
              if (playerAmmo !== Infinity) {
                playerAmmo--;
                if (playerAmmo <= 0) {
                  // Ran out of bullets: switch back to basic weapon!
                  playerGun = 0;
                  currentWeaponType = powerType.BASIC;
                  playerAmmo = Infinity;
                }
              }
            }
          }
        });
      });

      //ENEMY LOGIC
      enemies.forEach((enemy, key) => {
        game_elements.forEach((el, elkey) => {
          const dist = el.distance(enemy);

          if (
            dist != null && (
              dist <= (enemy.enemy.graph.width * enemy.scale) ||
              dist <= (enemy.enemy.graph.height * enemy.scale) - 100
            )
          ) {
            if (elkey === 'player') {
              const playerEl = el as any;
              // Pass through if player is currently in invulnerability frames
              if (playerEl.isInvulnerable && playerEl.isInvulnerable()) {
                return;
              }

              // Meteor crashed into player
              el.reduceLive(20);
              enemy.reduceLive(200);
            } else {
              // Weapon projectile hit
              const shoot = el as Shoot;
              if (shoot.hasHit && shoot.hasHit(key)) {
                return;
              }
              if (shoot.registerHit) {
                shoot.registerHit(key);
              }

              const bulletDamage = shoot.damage || 100;
              enemy.reduceLive(bulletDamage);

              if (shoot.piercing) {
                shoot.reduceLive(50);
              } else {
                shoot.reduceLive(100);
              }
            }
          }
        });

        if (enemy?.getPosition()?.y > canvas.height) {
          enemy.hasPowerUp = false;
          enemyPool.release(enemy);
          enemies.delete(key);
          canEnemyCreator = true;
          return;
        }

        enemy.destroy(res => {
          const val = res as { onDestroy: boolean; onPowerUp: boolean; powerUpType: powerType; isGiant?: boolean };
          if (val?.onDestroy) {
            playEnemyExplosionSound(val.isGiant || false, val.onPowerUp);

            // Increment stage-based and persistent asteroid destruction counts
            stageAsteroidsDestroyed++;
            totalAsteroidsDestroyed++;
            updateRecords();

            if (val?.onPowerUp) {
              const p = powerUpPool.acquire(enemy.getPosition().x, enemy.getPosition().y, val.powerUpType);
              powerUps.set(p.id, p);
              val.onPowerUp = false;
            }

            for (let i = 0; i < 8; i++) {
              const x = Math.sin(Math.random() * i) * (canvas.width * 2);
              const y = Math.cos(Math.random() * i) * (canvas.height * -2);

              const particle = particlePool.acquire({
                x: enemy.getPosition().x,
                y: enemy.getPosition().y,
                targetX: x,
                targetY: y
              }, Math.random() - 0.5, true);

              particles.set(particle.id, particle);
            }
            score += 5;
            enemyPool.release(enemy);
            enemies.delete(key);
            canEnemyCreator = true;

            // Check if current stage objective is achieved
            if (stageAsteroidsDestroyed >= stageAsteroidGoal) {
              advanceStage();
            }
          }
        });
      });

      // POWER-UP LOGIC (Using typed PowerUpPool)
      const playerEl = game_elements.get('player');
      const playerPos = playerEl ? playerEl.getPosition() : null;

      powerUps.forEach((powerUp, key) => {
        if (playerPos && powerUp.isCollidingWithPlayer(playerPos.x, playerPos.y)) {
          powerUp.collect();
        }

        powerUp.destroy(res => {
          if (res?.onDestroy) {
            if (res.collected && playerEl) {
              applyPowerUp(res.powerUpType, playerEl);
            }
            powerUpPool.release(powerUp);
            powerUps.delete(key);
          }
        });
      });

      particles.forEach((p, pKey) => {
        p.destroy(val => {
          if (val) {
            particlePool.release(p as MeteorEnemy);
            particles.delete(pKey);
          }
        });
      });

      requestAnimationFrame(loop);
    }

    /**
     * 
     * @param dt number
     * @param ctx CanvasRenderingContext2D
     * @param canvas HTMLCanvasElement
     */
    function draw(dt: number, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {

      // Apply screen shake
      let shakeApplied = false;
      if (screenShakeTimer > 0) {
        screenShakeTimer -= dt;
        const progress = Math.max(0, screenShakeTimer / 280);
        const curMagnitude = screenShakeIntensity * progress;
        const offsetX = (Math.random() - 0.5) * 2 * curMagnitude;
        const offsetY = (Math.random() - 0.5) * 2 * curMagnitude;
        ctx.save();
        ctx.translate(offsetX, offsetY);
        shakeApplied = true;
      }

      bg.draw(dt, ctx, canvas);
      bg.update(dt, ctx, canvas);
      bg.destroy(level => {
        const rightX = canvas.width - 12;
        const infoY = 50;

        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#80d8ff';
        ctx.fillText(`SECTOR ${currentLevel}`, rightX, infoY);

        if (enemyPauseTimer > 0) {
          ctx.fillStyle = '#69f0ae';
          const restSecs = Math.ceil(enemyPauseTimer / 1000);
          ctx.fillText(`Rest Zone: ${restSecs}s`, rightX, infoY + 14);
        } else if (bg.isTransitioning) {
          ctx.fillStyle = '#80d8ff';
          const secs = Math.ceil(bg.transitTimer / 1000);
          ctx.fillText(`Next Sector: ${secs}s`, rightX, infoY + 14);
        }
        ctx.restore();
      });

      // Sector Cleared / Rest announcement banner
      if (sectorClearedBannerTimer > 0) {
        sectorClearedBannerTimer -= dt;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00e676';
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 18;
        ctx.font = 'bold 36px Arial';
        ctx.fillText(sectorClearedText, canvas.width / 2, canvas.height / 2 - 130);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fillText('SAFE ZONE - REST & RECHARGE', canvas.width / 2, canvas.height / 2 - 90);
        ctx.restore();
      }

      // Level announcement banner with glowing effect
      if (levelBannerTimer > 0) {
        levelBannerTimer -= dt;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;
        ctx.font = 'bold 38px Arial';
        ctx.fillText(levelBannerText, canvas.width / 2, canvas.height / 2 - 130);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fillText('APPROACHING PLANET - METEOR SWARM', canvas.width / 2, canvas.height / 2 - 90);
        ctx.restore();
      }

      powerUps.forEach(powerUp => {
        powerUp.draw(dt, ctx, canvas);
        powerUp.update(dt, ctx, canvas);
      });

      enemies.forEach((enemy, key) => {
        enemy.draw(dt, ctx, canvas);
        enemy.update(dt, ctx, canvas);
      });

      particles.forEach((p, pKey) => {
        p.draw(dt, ctx, canvas);
        p.update(dt, ctx, canvas);
      });

      game_elements.forEach(el => {
        el.draw(dt, ctx, canvas);
        el.update(dt, ctx, canvas);
      });

      // Draw expanding impact shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life -= dt;
        const progress = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = 12 + (sw.maxRadius - 12) * progress;
        sw.alpha = (1 - progress) * 0.85;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3 * (1 - progress) + 1;
        ctx.globalAlpha = sw.alpha;
        ctx.stroke();
        ctx.restore();

        if (sw.life <= 0) {
          shockwaves.splice(i, 1);
        }
      }

      // Draw floating combat damage texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy;
        ft.alpha = Math.max(0, ft.life / ft.maxLife);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.shadowColor;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.life <= 0) {
          floatingTexts.splice(i, 1);
        }
      }

      // Restore screen shake transformation
      if (shakeApplied) {
        ctx.restore();
      }

      // Screen damage flash vignette (drawn in fixed screen coordinates)
      if (screenFlashTimer > 0) {
        screenFlashTimer -= dt;
        const alpha = Math.max(0, screenFlashTimer / screenFlashMaxTime) * 0.45;
        const grad = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
          canvas.width / 2, canvas.height / 2, canvas.height * 0.75
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, screenFlashColor.replace('ALPHA', alpha.toFixed(3)));
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      if (gameover) {
        drawGameOverScreen(ctx, canvas);
      } else {
        // Weapon and Ammo counter display in HUD
        const ammoDisplay = playerAmmo === Infinity ? '∞' : `${playerAmmo}`;
        const isMobileScreen = canvas.width < 600;
        ctx.save();
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'left';

        if (isMobileScreen) {
          ctx.font = 'bold 10px Arial';
          ctx.fillStyle = '#80d8ff';
          const hudY = shieldedPlayer && shieldedPlayer.shield.resistance > 0 ? 44 : 32;
          ctx.fillText(`GUN: ${gunType[playerGun].toUpperCase()} [${ammoDisplay}]`, 12, hudY);
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`SCORE: ${score}`, 12, hudY + 13);
        } else {
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#80d8ff';
          ctx.fillText(`GUN: ${gunType[playerGun].toUpperCase()} [${ammoDisplay}]`, 14, 58);
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`SCORE: ${score}`, 14, 76);
          ctx.fillStyle = '#b0bec5';
          ctx.fillText(`RECORD: ${bestAsteroidsRecord}`, 14, 94);
        }
        ctx.restore();

        // Stage Objective badge at top-center
        drawStageObjectiveHUD(ctx, canvas);

        // Pause Button at top-right
        drawPauseButton(ctx, canvas);
      }
    }

    function drawStageObjectiveHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();
      const isMobileScreen = canvas.width < 600;
      const badgeW = isMobileScreen ? Math.min(220, Math.max(130, canvas.width - 180)) : 340;
      const badgeH = isMobileScreen ? 28 : 34;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = 10;

      // Glassmorphism container
      ctx.fillStyle = 'rgba(8, 16, 28, 0.82)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      // Progress bar underlay
      const progress = Math.min(1, stageAsteroidsDestroyed / stageAsteroidGoal);
      const progFillW = (badgeW - 6) * progress;
      const isNearComplete = progress >= 0.8;
      const barColor = isNearComplete ? '#ffd600' : '#00e5ff';
      ctx.fillStyle = isNearComplete ? 'rgba(255, 214, 0, 0.22)' : 'rgba(0, 229, 255, 0.18)';
      ctx.fillRect(badgeX + 3, badgeY + 3, progFillW, badgeH - 6);

      // Progress line at bottom of badge
      ctx.fillStyle = barColor;
      ctx.shadowColor = barColor;
      ctx.shadowBlur = isNearComplete ? 8 : 4;
      ctx.fillRect(badgeX + 3, badgeY + badgeH - 3, progFillW, 3);

      // Text: Stage X — Y / Z Asteroids Destroyed
      ctx.font = isMobileScreen ? 'bold 11px Arial' : 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      const text = isMobileScreen
        ? (badgeW < 170 ? `S${currentStage}: ${stageAsteroidsDestroyed}/${stageAsteroidGoal}` : `Stage ${currentStage} — ${stageAsteroidsDestroyed}/${stageAsteroidGoal}`)
        : `Stage ${currentStage} — ${stageAsteroidsDestroyed} / ${stageAsteroidGoal} Asteroids Destroyed`;
      ctx.fillText(text, canvas.width / 2, badgeY + (isMobileScreen ? 18 : 21));
      ctx.restore();
    }

    function drawPauseButton(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();
      const isMobileScreen = canvas.width < 600;
      const btnW = isMobileScreen ? 44 : 114;
      const btnH = 32;
      const btnX = canvas.width - btnW - 12;
      const btnY = 10;

      ctx.fillStyle = 'rgba(10, 20, 36, 0.85)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.font = isMobileScreen ? 'bold 16px Arial' : 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#80d8ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.fillText(isMobileScreen ? '⏸' : '⏸ PAUSE (P)', btnX + btnW / 2, btnY + (isMobileScreen ? 22 : 20));
      ctx.restore();
    }

    function drawWelcomeScreen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();

      const isMobileScreen = canvas.width < 600;
      const isLandscapeMobile = canvas.height < 460;

      // Dark radial cosmic vignette over starfield
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.12,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75
      );
      bgGrad.addColorStop(0, 'rgba(6, 12, 28, 0.42)');
      bgGrad.addColorStop(1, 'rgba(2, 4, 12, 0.88)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cardW = Math.min(480, canvas.width - 24);
      const cardH = Math.min(canvas.height - 24, isLandscapeMobile ? 315 : 425);
      const cardX = (canvas.width - cardW) / 2;
      const cardY = (canvas.height - cardH) / 2;

      // Glassmorphism Card
      ctx.fillStyle = 'rgba(10, 18, 34, 0.95)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 24;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Top Mission Badge
      const pulse = (Math.sin(performance.now() / 420) + 1) / 2;
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#69f0ae';
      ctx.shadowColor = '#69f0ae';
      ctx.shadowBlur = 6;
      const badgeY = isLandscapeMobile ? cardY + 22 : cardY + 34;
      ctx.fillText('★ PLANETARY DEFENSE COMMAND ★', canvas.width / 2, badgeY);

      // Main Title: PLANET DEFENDER
      const titleFont = isLandscapeMobile ? 'bold 28px Arial' : (isMobileScreen ? 'bold 32px Arial' : 'bold 40px Arial');
      ctx.font = titleFont;
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 14 + pulse * 10;
      const titleY = badgeY + (isLandscapeMobile ? 32 : 44);
      ctx.fillText('PLANET DEFENDER', canvas.width / 2, titleY);

      // Subtitle
      ctx.font = isLandscapeMobile ? '10px Arial' : 'bold 12px Arial';
      ctx.fillStyle = '#80d8ff';
      ctx.shadowBlur = 4;
      const subY = titleY + (isLandscapeMobile ? 18 : 24);
      ctx.fillText('DEEP SPACE ASTEROID INTERCEPT INITIATIVE', canvas.width / 2, subY);

      // Divider Line
      const divY = subY + 12;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 28, divY);
      ctx.lineTo(cardX + cardW - 28, divY);
      ctx.stroke();

      // Hall of Fame / Records Box
      const recBoxW = cardW - 48;
      const recBoxH = isLandscapeMobile ? 48 : 66;
      const recBoxX = cardX + 24;
      const recBoxY = divY + (isLandscapeMobile ? 12 : 20);

      ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.fillRect(recBoxX, recBoxY, recBoxW, recBoxH);
      ctx.strokeRect(recBoxX, recBoxY, recBoxW, recBoxH);

      if (bestAsteroidsRecord > 0) {
        ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 14px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.fillText(`🏆 ALL-TIME RECORD: ${bestAsteroidsRecord} ASTEROIDS`, canvas.width / 2, recBoxY + (isLandscapeMobile ? 20 : 27));

        ctx.font = isLandscapeMobile ? '11px Arial' : '12px Arial';
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 4;
        ctx.fillText(`FURTHEST SECTOR: STAGE ${bestStageRecord}`, canvas.width / 2, recBoxY + (isLandscapeMobile ? 38 : 49));
      } else {
        ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 13px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.fillText('⭐ NEW PILOT RECRUIT DETECTED', canvas.width / 2, recBoxY + (isLandscapeMobile ? 20 : 27));

        ctx.font = isLandscapeMobile ? '11px Arial' : '12px Arial';
        ctx.fillStyle = '#80d8ff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 2;
        ctx.fillText('DEPLOY TO ESTABLISH YOUR FIRST MISSION RECORD!', canvas.width / 2, recBoxY + (isLandscapeMobile ? 38 : 49));
      }

      // Action Buttons
      const btn1W = Math.min(250, cardW - 40);
      const btn1H = isLandscapeMobile ? 36 : 46;
      const btn1X = (canvas.width - btn1W) / 2;
      const btn1Y = recBoxY + recBoxH + (isLandscapeMobile ? 12 : 24);
      welcomeStartBtnRect = { x: btn1X, y: btn1Y, w: btn1W, h: btn1H };

      // START GAME Button (Glowing Emerald)
      ctx.fillStyle = 'rgba(0, 230, 118, 0.28)';
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 10 + pulse * 8;
      ctx.fillRect(btn1X, btn1Y, btn1W, btn1H);
      ctx.strokeRect(btn1X, btn1Y, btn1W, btn1H);

      ctx.font = isLandscapeMobile ? 'bold 15px Arial' : 'bold 17px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🚀 START GAME', canvas.width / 2, btn1Y + (isLandscapeMobile ? 23 : 29));

      // HOW TO PLAY Button
      const btn2W = Math.min(200, cardW - 60);
      const btn2H = isLandscapeMobile ? 30 : 36;
      const btn2X = (canvas.width - btn2W) / 2;
      const btn2Y = btn1Y + btn1H + (isLandscapeMobile ? 8 : 12);
      welcomeHowToPlayBtnRect = { x: btn2X, y: btn2Y, w: btn2W, h: btn2H };

      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.fillRect(btn2X, btn2Y, btn2W, btn2H);
      ctx.strokeRect(btn2X, btn2Y, btn2W, btn2H);

      ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 13px Arial';
      ctx.fillStyle = '#80d8ff';
      ctx.fillText('ℹ️ HOW TO PLAY', canvas.width / 2, btn2Y + (isLandscapeMobile ? 20 : 23));

      // Launch prompt note
      ctx.font = '11px Arial';
      ctx.fillStyle = '#78909c';
      ctx.shadowBlur = 0;
      const noteY = cardY + cardH - (isLandscapeMobile ? 8 : 12);
      ctx.fillText(isMobileScreen ? 'Tap START GAME to Launch' : 'Press ENTER or SPACE to Launch', canvas.width / 2, noteY);

      ctx.restore();
    }

    function drawHowToPlayModal(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();
      // Backdrop
      ctx.fillStyle = 'rgba(4, 8, 20, 0.94)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobileScreen = canvas.width < 600;
      const isLandscapeMobile = canvas.height < 460;

      const cardW = Math.min(500, canvas.width - 20);
      const cardH = Math.min(canvas.height - 20, isLandscapeMobile ? 315 : 460);
      const cardX = (canvas.width - cardW) / 2;
      const cardY = (canvas.height - cardH) / 2;

      // Modal container
      ctx.fillStyle = 'rgba(12, 22, 42, 0.98)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 24;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Title
      ctx.textAlign = 'center';
      ctx.font = isLandscapeMobile ? 'bold 18px Arial' : (isMobileScreen ? 'bold 20px Arial' : 'bold 24px Arial');
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      const titleY = isLandscapeMobile ? cardY + 28 : cardY + 36;
      ctx.fillText('MISSION DIRECTIVE & HOW TO PLAY', canvas.width / 2, titleY);

      // Divider line
      const divY = titleY + 10;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 24, divY);
      ctx.lineTo(cardX + cardW - 24, divY);
      ctx.stroke();

      // Content items
      const padX = isMobileScreen ? 20 : 28;
      const textX = cardX + padX;
      let curY = divY + (isLandscapeMobile ? 18 : 26);
      const stepY = isLandscapeMobile ? 42 : 55;

      const drawSection = (icon: string, title: string, desc: string, titleColor: string = '#ffd700') => {
        ctx.textAlign = 'left';
        ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 14px Arial';
        ctx.fillStyle = titleColor;
        ctx.shadowColor = titleColor;
        ctx.shadowBlur = 4;
        ctx.fillText(`${icon} ${title}`, textX, curY);

        ctx.font = isLandscapeMobile ? '10px Arial' : (isMobileScreen ? '11px Arial' : '12px Arial');
        ctx.fillStyle = '#cfd8dc';
        ctx.shadowBlur = 0;
        ctx.fillText(desc, textX + 16, curY + (isLandscapeMobile ? 14 : 18));
        curY += stepY;
      };

      drawSection(
        '🎯',
        'STAGE OBJECTIVE',
        'Destroy the required asteroid quota displayed at the top to clear the sector.',
        '#69f0ae'
      );

      drawSection(
        '🕹️',
        'PILOT CONTROLS',
        isMobileScreen
          ? 'Drag anywhere to pilot ship & auto-fire with thumb offset • Tap ⏸ to pause.'
          : 'Mouse or Arrows to steer • Left-Click / Space to fire • P or Esc to pause.',
        '#00e5ff'
      );

      drawSection(
        '⚡',
        'POWER-UP RECOVERY',
        '🛡️ Shield (absorbs damage) • ⚡ Blaster Volleys • 🔴 Laser (pierces lines) • 💊 Repair Pill.',
        '#ffd700'
      );

      drawSection(
        '🏆',
        'PERSISTENT RECORDS',
        'Your asteroid kill count & furthest stage are saved across runs. Aim for the high score!',
        '#ff80ab'
      );

      // Buttons: Start Game and Close
      const btnW = Math.min(170, (cardW - 60) / 2);
      const btnH = isLandscapeMobile ? 30 : 38;
      const btnDeployX = cardX + (cardW / 2) - btnW - 8;
      const btnCloseX = cardX + (cardW / 2) + 8;
      const btnY = cardY + cardH - (isLandscapeMobile ? 40 : 48);

      howToPlayDeployBtnRect = { x: btnDeployX, y: btnY, w: btnW, h: btnH };
      howToPlayCloseBtnRect = { x: btnCloseX, y: btnY, w: btnW, h: btnH };

      // Deploy Button
      ctx.fillStyle = 'rgba(0, 230, 118, 0.28)';
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 8;
      ctx.fillRect(btnDeployX, btnY, btnW, btnH);
      ctx.strokeRect(btnDeployX, btnY, btnW, btnH);

      ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🚀 DEPLOY NOW', btnDeployX + btnW / 2, btnY + (isLandscapeMobile ? 20 : 24));

      // Close Button
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.fillRect(btnCloseX, btnY, btnW, btnH);
      ctx.strokeRect(btnCloseX, btnY, btnW, btnH);

      ctx.fillStyle = '#cfd8dc';
      ctx.fillText('✖ CLOSE', btnCloseX + btnW / 2, btnY + (isLandscapeMobile ? 20 : 24));

      ctx.restore();
    }

    function drawPauseScreen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();
      // Semi-transparent backdrop
      ctx.fillStyle = 'rgba(5, 10, 22, 0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobileScreen = canvas.width < 600;
      const isLandscapeMobile = canvas.height < 460;
      const cardW = Math.min(460, canvas.width - 24);
      const cardH = Math.min(canvas.height - 24, isLandscapeMobile ? 310 : 390);
      const cardX = (canvas.width - cardW) / 2;
      const cardY = (canvas.height - cardH) / 2;

      // Glassmorphism Card
      ctx.fillStyle = 'rgba(12, 22, 40, 0.97)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 20;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Header
      ctx.textAlign = 'center';
      ctx.font = isLandscapeMobile ? 'bold 22px Arial' : (isMobileScreen ? 'bold 26px Arial' : 'bold 30px Arial');
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      const headerY = isLandscapeMobile ? cardY + 30 : cardY + 42;
      ctx.fillText('⏸ GAME PAUSED', canvas.width / 2, headerY);

      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#80d8ff';
      ctx.shadowBlur = 4;
      const subY = headerY + (isLandscapeMobile ? 18 : 22);
      ctx.fillText('STAGE SUMMARY', canvas.width / 2, subY);

      // Divider line
      const divY = subY + 10;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 24, divY);
      ctx.lineTo(cardX + cardW - 24, divY);
      ctx.stroke();

      // Stage Statistics
      const padX = isMobileScreen ? 24 : 40;
      const labelX = cardX + padX;
      const valX = cardX + cardW - padX;
      let lineY = divY + (isLandscapeMobile ? 20 : 26);
      const lineHeight = isLandscapeMobile ? 20 : 26;

      const drawStatRow = (label: string, value: string, valColor: string = '#ffffff') => {
        ctx.font = isLandscapeMobile ? '12px Arial' : (isMobileScreen ? '13px Arial' : '14px Arial');
        ctx.textAlign = 'left';
        ctx.fillStyle = '#b0bec5';
        ctx.shadowBlur = 0;
        ctx.fillText(label, labelX, lineY);

        ctx.font = isLandscapeMobile ? 'bold 13px Arial' : (isMobileScreen ? 'bold 14px Arial' : 'bold 15px Arial');
        ctx.textAlign = 'right';
        ctx.fillStyle = valColor;
        ctx.shadowColor = valColor;
        ctx.shadowBlur = 6;
        ctx.fillText(value, valX, lineY);
        lineY += lineHeight;
      };

      drawStatRow(isMobileScreen ? 'Current Stage' : 'Current Stage', `Stage ${currentStage}`, '#00e5ff');
      drawStatRow(isMobileScreen ? 'Destroyed' : 'Asteroids Destroyed', `${stageAsteroidsDestroyed} / ${stageAsteroidGoal}`, '#69f0ae');
      drawStatRow(isMobileScreen ? 'Remaining' : 'Asteroids Remaining', `${Math.max(0, stageAsteroidGoal - stageAsteroidsDestroyed)}`, '#ffd600');
      drawStatRow('Current Record', `${bestAsteroidsRecord} Asteroids`, '#ffd700');
      drawStatRow(isMobileScreen ? 'Total (Run)' : 'Total Destroyed (Run)', `${totalAsteroidsDestroyed}`, '#ffffff');

      // Progress Bar
      const barW = cardW - (padX * 2);
      const barH = isLandscapeMobile ? 9 : 12;
      const barX = cardX + padX;
      const barY = lineY + 3;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeRect(barX, barY, barW, barH);

      const prog = Math.min(1, stageAsteroidsDestroyed / stageAsteroidGoal);
      if (prog > 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * prog, barH - 4);
      }

      // Buttons: Resume & Main Menu
      const canFitSideBySide = cardW >= 360 && !isLandscapeMobile;
      const btnH = isLandscapeMobile ? 28 : 36;

      if (canFitSideBySide) {
        const btnW = Math.min(185, (cardW - 56) / 2);
        const btn1X = cardX + (cardW / 2) - btnW - 8;
        const btn2X = cardX + (cardW / 2) + 8;
        const btnY = cardY + cardH - 52;

        pauseResumeBtnRect = { x: btn1X, y: btnY, w: btnW, h: btnH };
        pauseQuitBtnRect = { x: btn2X, y: btnY, w: btnW, h: btnH };

        // Resume Button
        ctx.fillStyle = 'rgba(0, 230, 118, 0.22)';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 8;
        ctx.fillRect(btn1X, btnY, btnW, btnH);
        ctx.strokeRect(btn1X, btnY, btnW, btnH);

        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▶ RESUME', btn1X + btnW / 2, btnY + 23);

        // Quit Button
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.fillRect(btn2X, btnY, btnW, btnH);
        ctx.strokeRect(btn2X, btnY, btnW, btnH);

        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#cfd8dc';
        ctx.fillText('🏠 MAIN MENU', btn2X + btnW / 2, btnY + 23);
      } else {
        const btnW = Math.min(210, cardW - 36);
        const btnX = (canvas.width - btnW) / 2;
        const btn1Y = cardY + cardH - (isLandscapeMobile ? 66 : 82);
        const btn2Y = cardY + cardH - (isLandscapeMobile ? 32 : 42);

        pauseResumeBtnRect = { x: btnX, y: btn1Y, w: btnW, h: btnH };
        pauseQuitBtnRect = { x: btnX, y: btn2Y, w: btnW, h: btnH };

        // Resume Button
        ctx.fillStyle = 'rgba(0, 230, 118, 0.22)';
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 8;
        ctx.fillRect(btnX, btn1Y, btnW, btnH);
        ctx.strokeRect(btnX, btn1Y, btnW, btnH);

        ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▶ RESUME', btnX + btnW / 2, btn1Y + (isLandscapeMobile ? 19 : 23));

        // Quit Button
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.fillRect(btnX, btn2Y, btnW, btnH);
        ctx.strokeRect(btnX, btn2Y, btnW, btnH);

        ctx.font = isLandscapeMobile ? 'bold 11px Arial' : 'bold 12px Arial';
        ctx.fillStyle = '#cfd8dc';
        ctx.fillText('🏠 MAIN MENU', btnX + btnW / 2, btn2Y + (isLandscapeMobile ? 18 : 22));
      }

      ctx.font = '11px Arial';
      ctx.fillStyle = '#78909c';
      ctx.shadowBlur = 0;
      ctx.fillText(isMobileScreen ? 'Tap button to select' : 'Press P / Esc to Resume', canvas.width / 2, cardY + cardH - 6);

      ctx.restore();
    }

    function drawGameOverScreen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      ctx.save();
      // Darkened red-tinted backdrop
      ctx.fillStyle = 'rgba(10, 4, 14, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isMobileScreen = canvas.width < 600;
      const isLandscapeMobile = canvas.height < 460;
      const cardW = Math.min(460, canvas.width - 24);
      const cardH = Math.min(canvas.height - 24, isLandscapeMobile ? 320 : 425);
      const cardX = (canvas.width - cardW) / 2;
      const cardY = (canvas.height - cardH) / 2;

      // Glassmorphism Card
      ctx.fillStyle = 'rgba(22, 10, 26, 0.97)';
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 24;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Header
      ctx.textAlign = 'center';
      ctx.font = isLandscapeMobile ? 'bold 24px Arial' : (isMobileScreen ? 'bold 28px Arial' : 'bold 36px Arial');
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 16;
      const headerY = isLandscapeMobile ? cardY + 30 : cardY + 42;
      ctx.fillText('GAME OVER', canvas.width / 2, headerY);

      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = '#ff8a80';
      ctx.shadowBlur = 4;
      const subY = headerY + (isLandscapeMobile ? 18 : 22);
      ctx.fillText('MISSION SUMMARY', canvas.width / 2, subY);

      // Divider line
      const divY = subY + 10;
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 24, divY);
      ctx.lineTo(cardX + cardW - 24, divY);
      ctx.stroke();

      // Run Statistics
      const padX = isMobileScreen ? 24 : 40;
      const labelX = cardX + padX;
      const valX = cardX + cardW - padX;
      let lineY = divY + (isLandscapeMobile ? 20 : 26);
      const lineHeight = isLandscapeMobile ? 20 : 26;

      const isNewRecord = totalAsteroidsDestroyed >= bestAsteroidsRecord && totalAsteroidsDestroyed > 0;

      const drawStatRow = (label: string, value: string, valColor: string = '#ffffff') => {
        ctx.font = isLandscapeMobile ? '12px Arial' : (isMobileScreen ? '13px Arial' : '14px Arial');
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cfd8dc';
        ctx.shadowBlur = 0;
        ctx.fillText(label, labelX, lineY);

        ctx.font = isLandscapeMobile ? 'bold 13px Arial' : (isMobileScreen ? 'bold 14px Arial' : 'bold 15px Arial');
        ctx.textAlign = 'right';
        ctx.fillStyle = valColor;
        ctx.shadowColor = valColor;
        ctx.shadowBlur = 6;
        ctx.fillText(value, valX, lineY);
        lineY += lineHeight;
      };

      drawStatRow('Record', `${bestAsteroidsRecord}${isNewRecord ? ' 🏆 (NEW!)' : ''}`, '#ffd700');
      drawStatRow('Last Stage', `${currentStage}`, '#00e5ff');
      drawStatRow('Total Asteroids', `${totalAsteroidsDestroyed}`, '#ff5252');
      drawStatRow(`Stage ${currentStage} Asteroids`, `${stageAsteroidsDestroyed} / ${stageAsteroidGoal}`, '#ffab40');
      drawStatRow('Stages Completed', `${stagesCompleted}`, '#69f0ae');
      drawStatRow('Final Score', `${score}`, '#ffffff');

      // Buttons: Play Again & Main Menu
      const canFitSideBySide = cardW >= 360 && !isLandscapeMobile;
      const btnH = isLandscapeMobile ? 30 : 38;

      if (canFitSideBySide) {
        const btnW = Math.min(185, (cardW - 56) / 2);
        const btn1X = cardX + (cardW / 2) - btnW - 8;
        const btn2X = cardX + (cardW / 2) + 8;
        const btnY = cardY + cardH - 56;

        gameOverPlayAgainBtnRect = { x: btn1X, y: btnY, w: btnW, h: btnH };
        gameOverMainMenuBtnRect = { x: btn2X, y: btnY, w: btnW, h: btnH };

        // Play Again Button
        ctx.fillStyle = 'rgba(255, 23, 68, 0.28)';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.fillRect(btn1X, btnY, btnW, btnH);
        ctx.strokeRect(btn1X, btnY, btnW, btnH);

        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🔄 PLAY AGAIN', btn1X + btnW / 2, btnY + 24);

        // Main Menu Button
        ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(btn2X, btnY, btnW, btnH);
        ctx.strokeRect(btn2X, btnY, btnW, btnH);

        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#80d8ff';
        ctx.fillText('🏠 MAIN MENU', btn2X + btnW / 2, btnY + 24);
      } else {
        const btnW = Math.min(210, cardW - 36);
        const btnX = (canvas.width - btnW) / 2;
        const btn1Y = cardY + cardH - (isLandscapeMobile ? 68 : 84);
        const btn2Y = cardY + cardH - (isLandscapeMobile ? 32 : 42);

        gameOverPlayAgainBtnRect = { x: btnX, y: btn1Y, w: btnW, h: btnH };
        gameOverMainMenuBtnRect = { x: btnX, y: btn2Y, w: btnW, h: btnH };

        // Play Again Button
        ctx.fillStyle = 'rgba(255, 23, 68, 0.28)';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 10;
        ctx.fillRect(btnX, btn1Y, btnW, btnH);
        ctx.strokeRect(btnX, btn1Y, btnW, btnH);

        ctx.font = isLandscapeMobile ? 'bold 12px Arial' : 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🔄 PLAY AGAIN', btnX + btnW / 2, btn1Y + (isLandscapeMobile ? 20 : 24));

        // Main Menu Button
        ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(btnX, btn2Y, btnW, btnH);
        ctx.strokeRect(btnX, btn2Y, btnW, btnH);

        ctx.font = isLandscapeMobile ? 'bold 11px Arial' : 'bold 12px Arial';
        ctx.fillStyle = '#80d8ff';
        ctx.fillText('🏠 MAIN MENU', btnX + btnW / 2, btn2Y + (isLandscapeMobile ? 18 : 22));
      }

      ctx.font = '11px Arial';
      ctx.fillStyle = '#90a4ae';
      ctx.shadowBlur = 0;
      ctx.fillText(isMobileScreen ? 'Tap an option above' : 'Press SPACE to Replay • ESC for Menu', canvas.width / 2, cardY + cardH - 6);

      ctx.restore();
    }

    const isTouchPauseButton = (x: number, y: number) => {
      // Touch target area for pause button at top right (generous touch hit target)
      return x >= canvas.width - 90 && y <= 65;
    };

    const handleActionClick = (x: number, y: number) => {
      // 1. Welcome Screen
      if (inWelcomeScreen) {
        if (showingHowToPlay) {
          if (isInsideRect(x, y, howToPlayDeployBtnRect)) {
            startGame();
          } else {
            showingHowToPlay = false;
            playPauseSound();
          }
          return;
        }

        if (isInsideRect(x, y, welcomeStartBtnRect)) {
          startGame();
          return;
        }

        if (isInsideRect(x, y, welcomeHowToPlayBtnRect)) {
          showingHowToPlay = true;
          playResumeSound();
          return;
        }
        return;
      }

      // 2. Pause Screen
      if (isPaused) {
        if (isInsideRect(x, y, pauseQuitBtnRect)) {
          goToWelcomeScreen();
          return;
        }
        togglePause();
        return;
      }

      // 3. Game Over Screen
      if (gameover) {
        if (isInsideRect(x, y, gameOverMainMenuBtnRect)) {
          goToWelcomeScreen();
          return;
        }
        startGame();
        return;
      }

      // 4. In-Game Pause Button
      if (isTouchPauseButton(x, y)) {
        togglePause();
      }
    };

    // Interaction Listeners (Mouse click & Mobile touch)
    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / (rect.width || 1);
      const scaleY = canvas.height / (rect.height || 1);
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      handleActionClick(mouseX, mouseY);
    });

    canvas.addEventListener('touchend', (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / (rect.width || 1);
        const scaleY = canvas.height / (rect.height || 1);
        const touchX = (touch.clientX - rect.left) * scaleX;
        const touchY = (touch.clientY - rect.top) * scaleY;
        handleActionClick(touchX, touchY);
      }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (inWelcomeScreen) {
        if (showingHowToPlay) {
          if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
            showingHowToPlay = false;
          }
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          startGame();
          return;
        }
        if (e.code === 'KeyH') {
          showingHowToPlay = true;
          return;
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
        return;
      }

      if (isPaused && (e.code === 'KeyM' || e.code === 'KeyQ')) {
        goToWelcomeScreen();
        return;
      }

      if (gameover) {
        if (e.code === 'Space' || e.code === 'Enter') {
          startGame();
          return;
        }
        if (e.code === 'Escape' || e.code === 'KeyM') {
          goToWelcomeScreen();
          return;
        }
      }
    });

    /**
     * 
     * @param conf { text: string, x: number, y: number, ctx: CanvasRenderingContext2D }
     * @param textCenter bool
     */
    function showText(conf: { text: string, x: number, y: number, ctx: CanvasRenderingContext2D }, textCenter?: boolean) {
      if (textCenter) ctx.textAlign = 'center';
      conf.ctx.fillStyle = "#fff"
      conf.ctx.font = "30px Arial";
      conf.ctx.fillText(conf.text, conf.x, conf.y);
    }

    /**
     * 
     * @returns string
     */
    function applyPowerUp(type: powerType, player: any) {
      switch (type) {
        case powerType.SHIELD:
          if (player && typeof player.activateShield === 'function') {
            player.activateShield(100);
          }
          break;

        case powerType.PILL:
          if (player && typeof player.restoreLive === 'function') {
            player.restoreLive();
          }
          break;

        case powerType.BASIC:
          currentWeaponType = powerType.BASIC;
          playerGun = 0;
          playerAmmo = Infinity; // Basic is unlimited
          break;

        case powerType.LASER:
          currentWeaponType = powerType.LASER;
          playerGun = 1;
          playerAmmo = Infinity; // Laser is unlimited
          break;

        case powerType.DOUBLE:
          if (currentWeaponType === powerType.DOUBLE) {
            // Same weapon: accumulate bullets!
            playerAmmo += 50;
          } else {
            // Different weapon: reset to base ammo!
            currentWeaponType = powerType.DOUBLE;
            playerGun = 2;
            playerAmmo = 50;
          }
          break;

        case powerType.TRIPLE:
          if (currentWeaponType === powerType.TRIPLE) {
            // Same weapon: accumulate bullets!
            playerAmmo += 35;
          } else {
            // Different weapon: reset to base ammo!
            currentWeaponType = powerType.TRIPLE;
            playerGun = 3;
            playerAmmo = 35;
          }
          break;
      }
    }

    loop(lastCall);

  }

}
