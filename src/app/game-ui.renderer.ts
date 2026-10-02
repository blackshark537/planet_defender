import {
  ButtonRect, FloatingText, Shockwave, isInsideRect, Special,
  BOMB_MAX, KILLS_PER_BOMB, COMBO_WINDOW
} from './game.types';

/* ───────────────────────── Tema ───────────────────────── */

// Si metes una fuente propia (ej. Orbitron en /assets), pónla de primera aquí.
const FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'Consolas, "SF Mono", "Roboto Mono", monospace';
const font = (px: number, bold = true, mono = false) =>
  `${bold ? 'bold ' : ''}${px}px ${mono ? MONO : FONT}`;

const C = {
  cyan: '#00e5ff', cyanSoft: '#80d8ff', green: '#00e676', greenSoft: '#69f0ae',
  gold: '#ffd740', orange: '#ffab00', red: '#ff1744', redSoft: '#ff8a80',
  pink: '#ff4081', blue: '#64b5f6', muted: '#90a4ae', dim: '#607d8b'
};

const SPECIAL_COLORS: Record<string, string> = { laser: C.pink, triple: C.cyan, double: C.gold };

type Variant = 'primary' | 'danger' | 'ghost' | 'neutral';

const BUTTON_STYLES: Record<Variant, { top: string; bottom: string; border: string; text: string; glow: string }> = {
  primary: { top: '#00e676', bottom: '#00b0ff', border: '#ffffff', text: '#04121c', glow: '#00e676' },
  danger: { top: 'rgba(255,23,68,0.60)', bottom: 'rgba(150,10,40,0.55)', border: '#ff1744', text: '#ffffff', glow: '#ff1744' },
  ghost: { top: 'rgba(0,229,255,0.22)', bottom: 'rgba(0,229,255,0.06)', border: '#00e5ff', text: '#80d8ff', glow: '#00e5ff' },
  neutral: { top: 'rgba(255,255,255,0.15)', bottom: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.40)', text: '#cfd8dc', glow: '#ffffff' }
};

interface ModalOptions {
  backdrop: string;
  accent: string;
  fillTop: string;
  fillBot: string;
  title: string;
  titlePx: [number, number, number];   // [landscape, mobile, desktop]
  subtitle: string;
  subtitleColor: string;
  maxW: number;
  maxH: [number, number];              // [landscape, normal]
  hero?: { label: string; value: string; color: string };
  rows: { label: string; value: string; color: string }[];
  progress?: number;
  btn1: { label: string; variant: Variant };
  btn2: { label: string; variant: Variant };
  footer: string;
  footerColor: string;
}

export class GameUIRenderer {
  welcomeStartBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  welcomeHowToPlayBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  howToPlayCloseBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  howToPlayDeployBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  gameOverPlayAgainBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  gameOverMainMenuBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  pauseResumeBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  pauseQuitBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  pauseBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  bombBtnRect: ButtonRect = { x: 0, y: 0, w: 0, h: 0 };

  // Barra de progreso del stage con suavizado (damp), independiente del framerate
  private stageProgress = 0;
  private lastStageT = 0;

  isTouchPauseButton(x: number, y: number): boolean {
    return isInsideRect(x, y, {
      x: this.pauseBtnRect.x - 8,
      y: this.pauseBtnRect.y - 8,
      w: this.pauseBtnRect.w + 16,
      h: this.pauseBtnRect.h + 16
    });
  }

  isTouchBombButton(x: number, y: number, pad: number = 12): boolean {
    const b = this.bombBtnRect;
    return x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
  }

  /* ───────────────────── Primitivas visuales ───────────────────── */

  private rgba(hex: string, a: number): string {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  private spacing(ctx: CanvasRenderingContext2D, px: number): void {
    // letterSpacing no existe en todos los WebView; si no existe, se ignora sin romper nada
    (ctx as any).letterSpacing = `${px}px`;
  }

  private path(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /** Reduce el tamaño de fuente hasta que el texto quepa en maxW. Deja ctx.font configurado. */
  private fit(ctx: CanvasRenderingContext2D, text: string, px: number, maxW: number, bold = true): number {
    let size = px;
    ctx.font = font(size, bold);
    while (size > 8 && ctx.measureText(text).width > maxW) {
      size--;
      ctx.font = font(size, bold);
    }
    return size;
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = t;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Texto pequeño en mayúsculas con tracking. La alineación la define quien llama. */
  private caption(
    ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
    px: number, color: string, spacing = 1.5, maxW?: number, bold = true
  ): void {
    ctx.save();
    this.spacing(ctx, spacing);
    if (maxW) this.fit(ctx, text, px, maxW, bold); else ctx.font = font(px, bold);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /** Texto con contorno oscuro: legible sobre cualquier fondo sin usar shadowBlur (más barato). */
  private outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeText(text, x, y);
    ctx.restore();
    ctx.fillText(text, x, y);
  }

  private divider(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, hex: string): void {
    const g = ctx.createLinearGradient(x1, 0, x2, 0);
    g.addColorStop(0, this.rgba(hex, 0));
    g.addColorStop(0.5, this.rgba(hex, 0.55));
    g.addColorStop(1, this.rgba(hex, 0));
    ctx.save();
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  private panel(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: string,
    opts: { radius?: number; glow?: number; top?: string; bottom?: string } = {}
  ): void {
    const r = opts.radius ?? 12;
    ctx.save();

    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, opts.top ?? 'rgba(20, 34, 58, 0.97)');
    g.addColorStop(1, opts.bottom ?? 'rgba(7, 13, 26, 0.98)');
    this.path(ctx, x, y, w, h, r);
    ctx.fillStyle = g;
    ctx.shadowColor = accent;
    ctx.shadowBlur = opts.glow ?? 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = this.rgba(accent, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brillo interior sutil
    this.path(ctx, x + 2.5, y + 2.5, w - 5, h - 5, Math.max(0, r - 2));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Filo de luz superior
    const tg = ctx.createLinearGradient(x + r, 0, x + w - r, 0);
    tg.addColorStop(0, this.rgba(accent, 0));
    tg.addColorStop(0.5, this.rgba(accent, 1));
    tg.addColorStop(1, this.rgba(accent, 0));
    ctx.strokeStyle = tg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y + 1);
    ctx.lineTo(x + w - r, y + 1);
    ctx.stroke();

    ctx.restore();
  }

  private button(
    ctx: CanvasRenderingContext2D, r: ButtonRect, label: string, variant: Variant, px: number, pulse = 0
  ): void {
    const s = BUTTON_STYLES[variant];
    const radius = Math.min(10, r.h / 2.4);

    ctx.save();
    this.path(ctx, r.x, r.y, r.w, r.h, radius);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, s.top);
    g.addColorStop(1, s.bottom);
    ctx.fillStyle = g;
    if (variant === 'primary') {
      // Relleno opaco: el glow del relleno es seguro
      ctx.shadowColor = s.glow;
      ctx.shadowBlur = 10 + pulse * 10;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    // En variantes translúcidas el glow va solo en el trazo; si no, se ve a través del relleno y lo lava
    if (variant !== 'primary') {
      ctx.shadowColor = s.glow;
      ctx.shadowBlur = 6;
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = s.border;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Brillo en la mitad superior
    this.path(ctx, r.x + 1.5, r.y + 1.5, r.w - 3, r.h / 2 - 1, radius - 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.text;
    this.fit(ctx, label, px, r.w - 20);
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.restore();
  }

  private progressBar(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number, color: string
  ): void {
    ctx.save();
    this.path(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (p > 0) {
      const fw = Math.max(h, w * Math.min(1, p));
      ctx.save();
      this.path(ctx, x, y, w, h, h / 2);
      ctx.clip();
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(x + fw - 3, y, 3, h);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ───────────────────────── HUD en juego ───────────────────────── */

  drawWeaponStackHUD(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    specialStack: Special[],
    getAmmo: (type: Special) => number,
    score: number,
    bestAsteroidsRecord: number,
    shieldActive: boolean,
    getCap?: (type: Special) => number   // opcional: habilita la barra de munición
  ): number {
    const mobile = canvas.width < 600;
    const x = mobile ? 10 : 12;
    const w = mobile ? 130 : 158;
    const top = shieldActive ? (mobile ? 33 : 41) : (mobile ? 21 : 29);
    const rowH = mobile ? 16 : 19;
    const pad = 6;
    const weaponRows = 1 + specialStack.length;
    const footRows = mobile ? 1 : 2;
    const h = pad * 2 + weaponRows * rowH + 8 + footRows * rowH;

    ctx.save();
    this.path(ctx, x, top, w, h, 8);
    ctx.fillStyle = 'rgba(6, 12, 24, 0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const ix = x + pad;
    const iw = w - pad * 2;
    let y = top + pad;

    // Arma básica (siempre activa, infinita)
    this.weaponRow(ctx, ix, y, iw, rowH, 'BASIC', '∞', C.blue, null, 'base', mobile, false);
    y += rowH;

    // Pila de especiales: el último es el activo (LIFO)
    const blink = performance.now() % 500 < 250;
    for (let i = specialStack.length - 1; i >= 0; i--) {
      const sp = specialStack[i];
      const ammo = getAmmo(sp);
      const cap = getCap ? Math.max(1, getCap(sp)) : 0;
      const active = i === specialStack.length - 1;
      this.weaponRow(
        ctx, ix, y, iw, rowH, sp.toUpperCase(), `${ammo}`,
        SPECIAL_COLORS[sp] || C.cyan, cap ? Math.min(1, ammo / cap) : null,
        active ? 'active' : 'paused', mobile, active && ammo <= 8 && blink
      );
      y += rowH;
    }

    // Separador + score
    this.divider(ctx, ix, ix + iw, y + 3, '#ffffff');
    y += 8;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    this.caption(ctx, 'SCORE', ix, y + rowH / 2, mobile ? 9 : 10, C.muted, 1.5);
    ctx.textAlign = 'right';
    ctx.font = font(mobile ? 12 : 13);
    ctx.fillStyle = C.gold;
    ctx.fillText(score.toLocaleString(), ix + iw, y + rowH / 2);
    y += rowH;

    if (!mobile) {
      ctx.textAlign = 'left';
      this.caption(ctx, 'BEST', ix, y + rowH / 2, 10, C.muted, 1.5);
      ctx.textAlign = 'right';
      ctx.font = font(12);
      ctx.fillStyle = '#b0bec5';
      ctx.fillText(bestAsteroidsRecord.toLocaleString(), ix + iw, y + rowH / 2);
    }
    ctx.restore();

    return top + h + (mobile ? 18 : 24);
  }

  private weaponRow(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    name: string, ammoText: string, color: string, ratio: number | null,
    state: 'base' | 'active' | 'paused', mobile: boolean, warn: boolean
  ): void {
    ctx.save();
    const alpha = state === 'paused' ? 0.45 : 1;

    if (state === 'active') {
      ctx.globalAlpha = 0.14;
      this.path(ctx, x - 3, y, w + 6, h - 1, 4);
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 3, 3, h - 8);

    ctx.textBaseline = 'middle';
    ctx.font = font(mobile ? 10 : 11, true, true);
    ctx.textAlign = 'left';
    ctx.fillStyle = state === 'paused' ? C.muted : color;
    ctx.fillText(name, x + 9, y + (h - 3) / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = warn ? C.red : (state === 'paused' ? C.muted : '#ffffff');
    ctx.fillText(ammoText, x + w, y + (h - 3) / 2);

    if (ratio !== null) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x + 9, y + h - 3, w - 9, 2);
      ctx.fillStyle = warn ? C.red : color;
      ctx.fillRect(x + 9, y + h - 3, (w - 9) * ratio, 2);
    }
    ctx.restore();
  }

  drawComboHUD(
    ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
    combo: number, comboMultiplier: number, comboTimer: number, customY?: number
  ): void {
    if (combo <= 1 && comboTimer <= 0) return;

    const mobile = canvas.width < 600;
    const x = mobile ? 12 : 14;
    const y = customY !== undefined ? customY : (mobile ? 68 : 118);
    const progress = Math.max(0, Math.min(1, comboTimer / COMBO_WINDOW));
    const color = comboMultiplier >= 6 ? C.red : (comboMultiplier >= 4 ? '#ff9100' : (comboMultiplier >= 2 ? C.gold : C.cyan));
    const pulse = comboMultiplier >= 4 ? 1 + 0.05 * Math.sin(performance.now() / 90) : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const mText = `x${comboMultiplier}`;
    ctx.font = font(mobile ? 22 : 28);
    const mw = ctx.measureText(mText).width;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    this.outlined(ctx, mText, 0, 0);
    ctx.shadowBlur = 0;

    this.caption(ctx, 'COMBO', mw + 8, mobile ? -10 : -13, mobile ? 9 : 10, color, 2);
    ctx.font = font(mobile ? 11 : 12);
    ctx.fillStyle = '#ffffff';
    this.outlined(ctx, `${combo} HITS`, mw + 8, 0);

    // La barra parpadea cuando el combo está a punto de romperse
    const dying = progress < 0.25 && performance.now() % 300 < 150;
    ctx.globalAlpha = dying ? 0.45 : 1;
    this.progressBar(ctx, 0, 7, mobile ? 92 : 126, 4, progress, color);
    ctx.restore();
  }

  drawSectorHUD(
    ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
    currentLevel: number, enemyPauseTimer: number, bg: any
  ): void {
    const rightX = canvas.width - 12;
    const infoY = 58;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    this.spacing(ctx, 1.5);
    ctx.font = font(11);
    ctx.fillStyle = C.cyanSoft;
    this.outlined(ctx, `SECTOR ${currentLevel}`, rightX, infoY);

    let status: string | null = null;
    let color = C.cyanSoft;
    if (enemyPauseTimer > 0) {
      status = `REST ZONE  ${Math.ceil(enemyPauseTimer / 1000)}s`;
      color = C.greenSoft;
    } else if (bg && bg.isTransitioning) {
      status = `NEXT SECTOR  ${Math.ceil(bg.transitTimer / 1000)}s`;
    }

    if (status) {
      ctx.font = font(10);
      ctx.fillStyle = color;
      this.outlined(ctx, status, rightX, infoY + 15);
      const tw = ctx.measureText(status).width;
      ctx.beginPath();
      ctx.arc(rightX - tw - 8, infoY + 11, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawStageObjectiveHUD(
    ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
    currentStage: number, stageAsteroidsDestroyed: number, stageAsteroidGoal: number
  ): void {
    const mobile = canvas.width < 600;
    const badgeW = mobile ? Math.min(220, Math.max(130, canvas.width - 180)) : 340;
    const badgeH = mobile ? 28 : 34;
    const badgeX = (canvas.width - badgeW) / 2;
    const badgeY = 10;

    // damp: independiente del framerate. Si el stage se reinicia, salta directo.
    const now = performance.now();
    const first = this.lastStageT === 0;
    const dt = Math.min(50, now - (this.lastStageT || now));
    this.lastStageT = now;
    const target = Math.min(1, stageAsteroidsDestroyed / Math.max(1, stageAsteroidGoal));
    if (first || target < this.stageProgress - 0.3) this.stageProgress = target;
    else this.stageProgress += (target - this.stageProgress) * (1 - Math.exp(-10 * dt / 1000));

    const near = target >= 0.8;
    const color = near ? C.gold : C.cyan;
    const pulse = near ? (Math.sin(now / 180) + 1) / 2 : 0;

    ctx.save();
    this.path(ctx, badgeX, badgeY, badgeW, badgeH, 8);
    ctx.fillStyle = 'rgba(8, 16, 28, 0.80)';
    ctx.shadowColor = color;
    ctx.shadowBlur = near ? 6 + pulse * 6 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.rgba(color, near ? 0.9 : 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const text = mobile
      ? (badgeW < 170 ? `S${currentStage}: ${stageAsteroidsDestroyed}/${stageAsteroidGoal}` : `STAGE ${currentStage} — ${stageAsteroidsDestroyed}/${stageAsteroidGoal}`)
      : `STAGE ${currentStage} — ${stageAsteroidsDestroyed} / ${stageAsteroidGoal} ASTEROIDS`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.spacing(ctx, 1);
    this.fit(ctx, text, mobile ? 11 : 13, badgeW - 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width / 2, badgeY + (badgeH - 10) / 2 + 1);
    this.spacing(ctx, 0);

    this.progressBar(ctx, badgeX + 8, badgeY + badgeH - 8, badgeW - 16, 4, this.stageProgress, color);
    ctx.restore();
  }

  drawPauseButton(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const mobile = canvas.width < 600;
    const w = mobile ? 44 : 114;
    const h = 32;
    const x = canvas.width - w - 12;
    const y = 10;
    this.pauseBtnRect = { x, y, w, h };

    ctx.save();
    this.path(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(10, 20, 36, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Icono de pausa vectorial (no depende de la fuente de emojis del dispositivo)
    const iconX = mobile ? x + w / 2 - 5 : x + 13;
    ctx.fillStyle = C.cyanSoft;
    ctx.fillRect(iconX, y + 9, 3.5, 14);
    ctx.fillRect(iconX + 7, y + 9, 3.5, 14);

    if (!mobile) {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      this.caption(ctx, 'PAUSE', x + 32, y + h / 2 + 1, 11, C.cyanSoft, 1.5);

      // Keycap "P"
      const kx = x + w - 30, ky = y + 7;
      this.path(ctx, kx, ky, 20, 18, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = font(11, true, true);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('P', kx + 10, ky + 9.5);
    }
    ctx.restore();
  }

  drawBombButton(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, bombs: number, bombCharge: number): void {
    const mobile = canvas.width < 600;
    const size = mobile ? 60 : 64;
    const x = 16, y = canvas.height - size - 20;
    this.bombBtnRect = { x, y, w: size, h: size };
    const cx = x + size / 2, cy = y + size / 2, r = size / 2;
    const ready = bombs > 0;
    const t = performance.now();
    const pulse = ready ? (Math.sin(t / 260) + 1) / 2 : 0;

    ctx.save();

    // Base del botón
    const base = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    base.addColorStop(0, ready ? 'rgba(255, 171, 0, 0.38)' : 'rgba(40, 56, 78, 0.9)');
    base.addColorStop(1, ready ? 'rgba(120, 50, 0, 0.55)' : 'rgba(10, 20, 36, 0.9)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.shadowColor = C.orange;
    ctx.shadowBlur = ready ? 8 + pulse * 8 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ready ? C.orange : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Anillo de carga hacia la siguiente bomba (o completo y dorado si está al máximo)
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.stroke();
    if (bombs >= BOMB_MAX) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = this.rgba(C.orange, 0.7);
      ctx.stroke();
    } else if (bombCharge > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (bombCharge / KILLS_PER_BOMB));
      ctx.strokeStyle = C.cyan;
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Icono de bomba vectorial
    ctx.globalAlpha = ready ? 1 : 0.4;
    const bx = cx - r * 0.06, by = cy + r * 0.14, br = r * 0.36;
    const body = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
    body.addColorStop(0, '#78909c');
    body.addColorStop(0.45, '#37474f');
    body.addColorStop(1, '#10161c');
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.translate(bx + br * 0.62, by - br * 0.62);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(-br * 0.22, -br * 0.3, br * 0.44, br * 0.3);
    ctx.restore();

    const tipX = bx + br * 0.83, tipY = by - br * 0.83;
    const endX = tipX + br * 0.45, endY = tipY - br * 0.4;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + br * 0.1, tipY - br * 0.45, endX, endY);
    ctx.strokeStyle = '#bcaaa4';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (ready) {
      const s = 2.6 + Math.sin(t / 55) * 1.1;
      ctx.beginPath();
      ctx.arc(endX, endY, s + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.8)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(endX, endY, s * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#fff59d';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Contador (badge)
    const badgeX = x + size - 3, badgeY = y + 5;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
    ctx.fillStyle = ready ? '#ff6d00' : '#37474f';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${bombs}`, badgeX, badgeY + 0.5);

    if (!mobile) {
      this.caption(ctx, '[B]', cx, y + size + 13, 10, C.muted, 1);
    }
    ctx.restore();
  }

  /* ───────────────────────── Efectos ───────────────────────── */

  drawShockwaves(ctx: CanvasRenderingContext2D, dt: number, shockwaves: Shockwave[]): void {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.life -= dt;
      const progress = 1 - Math.max(0, sw.life / sw.maxLife);
      const curRadius = sw.radius + (sw.maxRadius - sw.radius) * progress;
      const curAlpha = (1 - progress) * sw.alpha;

      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, curRadius, 0, Math.PI * 2);
      ctx.fillStyle = sw.color;
      ctx.globalAlpha = curAlpha * 0.10;
      ctx.fill();

      ctx.globalAlpha = curAlpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, 4 * (1 - progress));
      ctx.stroke();

      // Anillo interior, más tenue, que da profundidad
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, curRadius * 0.72, 0, Math.PI * 2);
      ctx.globalAlpha = curAlpha * 0.45;
      ctx.lineWidth = Math.max(1, 2.2 * (1 - progress));
      ctx.stroke();
      ctx.restore();

      if (sw.life <= 0) shockwaves.splice(i, 1);
    }
  }

  drawFloatingTexts(ctx: CanvasRenderingContext2D, dt: number, floatingTexts: FloatingText[]): void {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * (dt / 16);
      ft.alpha = Math.max(0, ft.life / ft.maxLife);

      const age = 1 - ft.life / ft.maxLife;
      const pop = age < 0.18 ? 1 + (1 - age / 0.18) * 0.45 : 1; // "pop" de entrada

      ctx.save();
      ctx.translate(ft.x, ft.y);
      ctx.scale(pop, pop);
      ctx.globalAlpha = ft.alpha;
      ctx.font = font(14);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.shadowColor;
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();

      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  /* ───────────────────────── Pantallas ───────────────────────── */

  drawWelcomeScreen(
    ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement,
    bestAsteroidsRecord: number, bestStageRecord: number
  ): void {
    const mobile = canvas.width < 600;
    const land = canvas.height < 460;
    const cx = canvas.width / 2;
    const pulse = (Math.sin(performance.now() / 420) + 1) / 2;

    ctx.save();

    const bgGrad = ctx.createRadialGradient(
      cx, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.12,
      cx, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75
    );
    bgGrad.addColorStop(0, 'rgba(6, 12, 28, 0.42)');
    bgGrad.addColorStop(1, 'rgba(2, 4, 12, 0.88)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardW = Math.min(480, canvas.width - 24);
    const cardH = Math.min(canvas.height - 24, land ? 282 : 372);
    const cardX = (canvas.width - cardW) / 2;
    const cardY = (canvas.height - cardH) / 2;
    this.panel(ctx, cardX, cardY, cardW, cardH, C.cyan, { glow: 22 });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Insignia
    const badgeY = land ? cardY + 22 : cardY + 34;
    this.caption(ctx, '★ PLANETARY DEFENSE COMMAND ★', cx, badgeY, 11, C.greenSoft, 2, cardW - 40);

    // Título con degradado
    const titleY = badgeY + (land ? 32 : 44);
    const title = 'PLANET DEFENDER';
    ctx.save();
    this.spacing(ctx, 2);
    this.fit(ctx, title, land ? 28 : (mobile ? 32 : 40), cardW - 40);
    const tw = ctx.measureText(title).width;
    const tg = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    tg.addColorStop(0, C.cyan);
    tg.addColorStop(0.5, '#e0f7fa');
    tg.addColorStop(1, C.cyan);
    ctx.fillStyle = tg;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.fillText(title, cx, titleY);
    ctx.restore();

    const subY = titleY + (land ? 18 : 24);
    this.caption(ctx, 'DEEP SPACE ASTEROID INTERCEPT INITIATIVE', cx, subY, land ? 10 : 12, C.cyanSoft, 1.2, cardW - 40);

    const divY = subY + 12;
    this.divider(ctx, cardX + 28, cardX + cardW - 28, divY, C.cyan);

    // Caja de récords
    const recW = cardW - 48;
    const recH = land ? 48 : 66;
    const recX = cardX + 24;
    const recY = divY + (land ? 12 : 20);
    this.path(ctx, recX, recY, recW, recH, 8);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.40)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (bestAsteroidsRecord > 0) {
      const half = recW / 2;
      const lx = recX + half / 2;
      const rx = recX + half * 1.5;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(recX + half, recY + 10);
      ctx.lineTo(recX + half, recY + recH - 10);
      ctx.stroke();

      this.caption(ctx, '🏆 ASTEROID RECORD', lx, recY + (land ? 16 : 22), land ? 9 : 10, C.muted, 1, half - 12);
      this.caption(ctx, 'BEST STAGE', rx, recY + (land ? 16 : 22), land ? 9 : 10, C.muted, 1, half - 12);

      ctx.font = font(land ? 18 : 24);
      ctx.shadowBlur = 6;
      ctx.shadowColor = C.gold;
      ctx.fillStyle = C.gold;
      ctx.fillText(`${bestAsteroidsRecord}`, lx, recY + (land ? 40 : 51));
      ctx.shadowColor = C.cyan;
      ctx.fillStyle = C.cyan;
      ctx.fillText(`${bestStageRecord}`, rx, recY + (land ? 40 : 51));
      ctx.shadowBlur = 0;
    } else {
      ctx.save();
      ctx.font = font(land ? 12 : 13);
      ctx.fillStyle = C.gold;
      ctx.shadowColor = C.gold;
      ctx.shadowBlur = 6;
      ctx.fillText('⭐ NEW PILOT RECRUIT DETECTED', cx, recY + (land ? 20 : 27));
      ctx.restore();
      this.caption(ctx, 'Destroy asteroids • Gather power-ups • Set high scores', cx, recY + (land ? 38 : 49),
        land ? 11 : 12, C.cyanSoft, 0.3, recW - 16, false);
    }

    // Botones
    const btnW = Math.min(220, cardW - 56);
    const btnH = land ? 34 : 44;
    const btnX = (canvas.width - btnW) / 2;
    const btn1Y = recY + recH + (land ? 12 : 22);
    const btn2Y = btn1Y + btnH + (land ? 8 : 12);
    this.welcomeStartBtnRect = { x: btnX, y: btn1Y, w: btnW, h: btnH };
    this.welcomeHowToPlayBtnRect = { x: btnX, y: btn2Y, w: btnW, h: btnH };
    this.button(ctx, this.welcomeStartBtnRect, '▶ START MISSION', 'primary', land ? 14 : 16, pulse);
    this.button(ctx, this.welcomeHowToPlayBtnRect, '📖 HOW TO PLAY', 'ghost', land ? 12 : 14);

    // Pista de lanzamiento con parpadeo suave
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.textAlign = 'center';
    this.caption(ctx, mobile ? 'TAP START MISSION TO LAUNCH' : 'PRESS ENTER OR SPACE TO LAUNCH',
      cx, cardY + cardH - (land ? 8 : 12), 10, C.dim, 1.5, cardW - 30);
    ctx.restore();

    ctx.restore();
  }

  drawHowToPlayModal(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const mobile = canvas.width < 600;
    const land = canvas.height < 460;
    const cx = canvas.width / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(4, 8, 20, 0.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardW = Math.min(500, canvas.width - 20);
    const cardH = Math.min(canvas.height - 20, land ? 315 : 460);
    const cardX = (canvas.width - cardW) / 2;
    const cardY = (canvas.height - cardH) / 2;
    this.panel(ctx, cardX, cardY, cardW, cardH, C.cyan, { glow: 22 });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titleY = land ? cardY + 28 : cardY + 38;
    ctx.save();
    this.spacing(ctx, 1.5);
    this.fit(ctx, 'MISSION DIRECTIVE & HOW TO PLAY', land ? 18 : (mobile ? 20 : 24), cardW - 40);
    ctx.fillStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 10;
    ctx.fillText('MISSION DIRECTIVE & HOW TO PLAY', cx, titleY);
    ctx.restore();

    const divY = titleY + 10;
    this.divider(ctx, cardX + 24, cardX + cardW - 24, divY, C.cyan);

    // Botones (se calculan antes para saber cuánto espacio queda)
    const btnW = Math.min(170, (cardW - 60) / 2);
    const btnH = land ? 30 : 38;
    const btnY = cardY + cardH - btnH - (land ? 10 : 16);
    this.howToPlayDeployBtnRect = { x: cx - btnW - 8, y: btnY, w: btnW, h: btnH };
    this.howToPlayCloseBtnRect = { x: cx + 8, y: btnY, w: btnW, h: btnH };

    // Secciones con texto que se ajusta a varias líneas
    const sections: { icon: string; title: string; desc: string; color: string }[] = [
      { icon: '🎯', title: 'STAGE OBJECTIVE', desc: 'Destroy the required asteroid quota shown at the top to clear the sector.', color: C.greenSoft },
      {
        icon: '🕹️', title: 'PILOT CONTROLS', color: C.cyan,
        desc: mobile
          ? 'Drag to steer & auto-fire • Tap the bomb button for a Screen Bomb • Tap ⏸ to pause.'
          : 'Mouse/Arrows to steer • Click/Space to fire • [B] for Screen Bomb • P to pause.'
      },
      { icon: '⚡', title: 'POWER-UPS', desc: '🛡️ Shield absorbs damage • ⚡ Double & Triple add firepower • 🔴 Laser pierces lines • 💊 Repair pill.', color: C.gold },
      { icon: '🏆', title: 'PERSISTENT RECORDS', desc: 'Your asteroid kill count and furthest stage are saved across runs. Aim for the high score!', color: '#ff80ab' }
    ];
    if (!land) {
      sections.splice(3, 0, {
        icon: '🔥', title: 'COMBO', color: '#ff9100',
        desc: 'Chain kills quickly to build a score multiplier before the timer runs out.'
      });
    }

    const padX = mobile ? 20 : 28;
    const textX = cardX + padX + 24;
    const textW = cardW - padX * 2 - 24;
    const titlePx = land ? 12 : 14;
    const descPx = land ? 10 : (mobile ? 11 : 12);
    const lh = descPx + 4;

    ctx.font = font(descPx, false);
    const blocks = sections.map(s => ({ ...s, lines: this.wrap(ctx, s.desc, textW) }));
    const heights = blocks.map(b => titlePx + 6 + b.lines.length * lh);
    const bodyTop = divY + (land ? 14 : 22);
    const bodyBottom = btnY - 10;
    const gap = Math.max(4, Math.min(16, (bodyBottom - bodyTop - heights.reduce((a, b) => a + b, 0)) / Math.max(1, blocks.length - 1)));

    let y = bodyTop;
    blocks.forEach((b, i) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${titlePx + 2}px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.icon, cardX + padX + 8, y + titlePx / 2 + 1);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      this.caption(ctx, b.title, textX, y + titlePx - 1, titlePx, b.color, 1.2);

      ctx.font = font(descPx, false);
      ctx.fillStyle = '#cfd8dc';
      b.lines.forEach((line, li) => ctx.fillText(line, textX, y + titlePx + 6 + descPx + li * lh - 2));
      y += heights[i] + gap;
    });

    this.button(ctx, this.howToPlayDeployBtnRect, '🚀 DEPLOY NOW', 'primary', land ? 12 : 14);
    this.button(ctx, this.howToPlayCloseBtnRect, '✖ CLOSE', 'neutral', land ? 12 : 14);

    ctx.restore();
  }

  drawPauseScreen(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: {
      currentStage: number;
      stageAsteroidsDestroyed: number;
      stageAsteroidGoal: number;
      bestAsteroidsRecord: number;
      totalAsteroidsDestroyed: number;
    }
  ): void {
    const { b1, b2 } = this.modal(ctx, canvas, {
      backdrop: 'rgba(5, 10, 22, 0.88)',
      accent: C.cyan,
      fillTop: 'rgba(20, 34, 58, 0.97)',
      fillBot: 'rgba(7, 13, 26, 0.98)',
      title: '⏸ GAME PAUSED',
      titlePx: [22, 26, 30],
      subtitle: 'STAGE SUMMARY',
      subtitleColor: C.cyanSoft,
      maxW: 460,
      maxH: [310, 390],
      rows: [
        { label: 'Current Stage', value: `Stage ${state.currentStage}`, color: C.cyan },
        { label: 'Destroyed', value: `${state.stageAsteroidsDestroyed} / ${state.stageAsteroidGoal}`, color: C.greenSoft },
        { label: 'Remaining', value: `${Math.max(0, state.stageAsteroidGoal - state.stageAsteroidsDestroyed)}`, color: '#ffd600' },
        { label: 'Current Record', value: `${state.bestAsteroidsRecord} Asteroids`, color: C.gold },
        { label: 'Total Destroyed (Run)', value: `${state.totalAsteroidsDestroyed}`, color: '#ffffff' }
      ],
      progress: Math.min(1, state.stageAsteroidsDestroyed / Math.max(1, state.stageAsteroidGoal)),
      btn1: { label: '▶ RESUME', variant: 'primary' },
      btn2: { label: '🏠 MAIN MENU', variant: 'neutral' },
      footer: canvas.width < 600 ? 'TAP A BUTTON TO SELECT' : 'PRESS P / ESC TO RESUME',
      footerColor: C.dim
    });
    this.pauseResumeBtnRect = b1;
    this.pauseQuitBtnRect = b2;
  }

  drawGameOverScreen(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    stats: {
      bestAsteroidsRecord: number;
      runStartRecord: number;
      currentStage: number;
      totalAsteroidsDestroyed: number;
      maxComboThisRun: number;
      stageAsteroidsDestroyed: number;
      stageAsteroidGoal: number;
      stagesCompleted: number;
      score: number;
    }
  ): void {
    const isNewRecord = stats.totalAsteroidsDestroyed > stats.runStartRecord;

    const rows = [
      { label: 'Record', value: `${stats.bestAsteroidsRecord}${isNewRecord ? ' 🏆 NEW!' : ''}`, color: C.gold },
      { label: 'Last Stage', value: `${stats.currentStage}`, color: C.cyan },
      { label: 'Total Asteroids', value: `${stats.totalAsteroidsDestroyed}`, color: '#ff5252' }
    ];
    if (stats.maxComboThisRun > 1) {
      rows.push({
        label: 'Max Combo',
        value: `x${Math.min(8, 1 + Math.floor(stats.maxComboThisRun / 4))} (${stats.maxComboThisRun} streak)`,
        color: '#ff9100'
      });
    }
    rows.push(
      { label: `Stage ${stats.currentStage} Asteroids`, value: `${stats.stageAsteroidsDestroyed} / ${stats.stageAsteroidGoal}`, color: '#ffab40' },
      { label: 'Stages Completed', value: `${stats.stagesCompleted}`, color: C.greenSoft }
    );

    const { b1, b2 } = this.modal(ctx, canvas, {
      backdrop: 'rgba(10, 4, 14, 0.92)',
      accent: C.red,
      fillTop: 'rgba(42, 14, 34, 0.97)',
      fillBot: 'rgba(14, 6, 18, 0.98)',
      title: 'GAME OVER',
      titlePx: [24, 28, 36],
      subtitle: 'MISSION SUMMARY',
      subtitleColor: C.redSoft,
      maxW: 460,
      maxH: [320, 425],
      hero: { label: 'FINAL SCORE', value: stats.score.toLocaleString(), color: '#ffffff' },
      rows,
      btn1: { label: '🔄 PLAY AGAIN', variant: 'danger' },
      btn2: { label: '🏠 MAIN MENU', variant: 'ghost' },
      footer: canvas.width < 600 ? 'TAP AN OPTION ABOVE' : 'PRESS SPACE TO REPLAY • ESC FOR MENU',
      footerColor: C.muted
    });
    this.gameOverPlayAgainBtnRect = b1;
    this.gameOverMainMenuBtnRect = b2;
  }

  /**
   * Layout común para Pausa y Game Over: fondo, tarjeta, título, héroe opcional,
   * filas adaptativas, barra opcional y dos botones (en fila o apilados).
   * Devuelve los rectángulos de los botones para el hit-test.
   */
  private modal(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, o: ModalOptions): { b1: ButtonRect; b2: ButtonRect } {
    const mobile = canvas.width < 600;
    const land = canvas.height < 460;
    const cx = canvas.width / 2;

    ctx.save();
    ctx.fillStyle = o.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cardW = Math.min(o.maxW, canvas.width - 24);
    const cardH = Math.min(canvas.height - 24, land ? o.maxH[0] : o.maxH[1]);
    const cardX = (canvas.width - cardW) / 2;
    const cardY = (canvas.height - cardH) / 2;
    this.panel(ctx, cardX, cardY, cardW, cardH, o.accent, { glow: 26, top: o.fillTop, bottom: o.fillBot });

    // Cabecera
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titlePx = land ? o.titlePx[0] : (mobile ? o.titlePx[1] : o.titlePx[2]);
    const headerY = cardY + (land ? 30 : 44);
    ctx.save();
    this.spacing(ctx, 2);
    this.fit(ctx, o.title, titlePx, cardW - 40);
    ctx.fillStyle = o.accent;
    ctx.shadowColor = o.accent;
    ctx.shadowBlur = 14;
    ctx.fillText(o.title, cx, headerY);
    ctx.restore();

    const subY = headerY + (land ? 17 : 22);
    this.caption(ctx, o.subtitle, cx, subY, 11, o.subtitleColor, 2.5);
    const divY = subY + 10;
    this.divider(ctx, cardX + 24, cardX + cardW - 24, divY, o.accent);

    // Botones: se calculan primero para repartir el espacio restante
    const side = cardW >= 360 && !land;
    const btnH = land ? 28 : 38;
    const btnPx = land ? 12 : 14;
    let b1: ButtonRect, b2: ButtonRect, btnTop: number;
    if (side) {
      const bw = Math.min(185, (cardW - 56) / 2);
      const by = cardY + cardH - btnH - 26;
      b1 = { x: cx - bw - 8, y: by, w: bw, h: btnH };
      b2 = { x: cx + 8, y: by, w: bw, h: btnH };
      btnTop = by;
    } else {
      const bw = Math.min(210, cardW - 36);
      const by2 = cardY + cardH - btnH - (land ? 25 : 26);
      const by1 = by2 - btnH - 8;
      b1 = { x: cx - bw / 2, y: by1, w: bw, h: btnH };
      b2 = { x: cx - bw / 2, y: by2, w: bw, h: btnH };
      btnTop = by1;
    }

    let y = divY + (land ? 8 : 12);

    // Marcador principal (opcional)
    if (o.hero) {
      const heroH = land ? 38 : 56;
      this.caption(ctx, o.hero.label, cx, y + (land ? 11 : 13), 10, C.muted, 3);
      ctx.save();
      this.fit(ctx, o.hero.value, land ? 24 : (mobile ? 30 : 38), cardW - 60);
      ctx.fillStyle = o.hero.color;
      ctx.shadowColor = o.hero.color;
      ctx.shadowBlur = 12;
      ctx.fillText(o.hero.value, cx, y + heroH - (land ? 6 : 10));
      ctx.restore();
      y += heroH + 2;
    }

    // Filas adaptativas
    const padX = mobile ? 24 : 40;
    const labelX = cardX + padX;
    const valX = cardX + cardW - padX;
    const barReserve = o.progress !== undefined ? (land ? 9 : 12) + 14 : 0;
    const avail = btnTop - 10 - barReserve - y;
    const lineH = Math.max(15, Math.min(land ? 20 : 28, avail / Math.max(1, o.rows.length)));
    const lPx = land ? 12 : (mobile ? 13 : 14);
    const vPx = land ? 13 : (mobile ? 14 : 15);

    ctx.textBaseline = 'middle';
    o.rows.forEach((r, i) => {
      const mid = y + lineH * i + lineH / 2;
      ctx.textAlign = 'left';
      ctx.font = font(lPx, false);
      ctx.fillStyle = '#b0bec5';
      ctx.fillText(r.label, labelX, mid);

      ctx.textAlign = 'right';
      ctx.font = font(vPx);
      ctx.fillStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 5;
      ctx.fillText(r.value, valX, mid);
      ctx.shadowBlur = 0;

      if (i < o.rows.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelX, y + lineH * (i + 1));
        ctx.lineTo(valX, y + lineH * (i + 1));
        ctx.stroke();
      }
    });
    y += lineH * o.rows.length;

    if (o.progress !== undefined) {
      this.progressBar(ctx, labelX, y + 8, cardW - padX * 2, land ? 9 : 12, o.progress, C.cyan);
    }

    this.button(ctx, b1, o.btn1.label, o.btn1.variant, btnPx);
    this.button(ctx, b2, o.btn2.label, o.btn2.variant, btnPx);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    this.caption(ctx, o.footer, cx, cardY + cardH - 8, 10, o.footerColor, 1.5, cardW - 30);

    ctx.restore();
    return { b1, b2 };
  }
}