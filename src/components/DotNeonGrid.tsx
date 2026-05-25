'use client';
import { useEffect, useMemo, useRef, memo } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';

const TWO_PI = Math.PI * 2;

// Visual tuning constants (extracted from magic numbers).
const PULSE_AMPLITUDE = 0.5;
const ACTIVE_OPACITY_BASE = 0.3;
const ACTIVE_OPACITY_PULSE = 0.9;
const INACTIVE_OPACITY_FACTOR = 0.3;
const RADIUS_PULSE = 0.6;
const DEFAULT_MAX_DPR = 2;

interface Dot {
  x: number;
  y: number;
  active: boolean;
  opacity: number;
  color: string;
  size: number;
  pulse: number;
}

export interface DotNeonGridProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Distance, in pixels, between dot centers. */
  dotSpacing?: number;
  /** Base radius of each dot, in pixels. */
  dotSize?: number;
  /** Random size jitter added on top of `dotSize`, in pixels. */
  dotSizeVariance?: number;
  /** Palette used to colorize dots. */
  colors?: string[];
  /** Canvas background fill. */
  backgroundColor?: string;
  /** Color of the connecting grid lines. */
  lineColor?: string;
  /** Opacity of the connecting grid lines (0-1). */
  lineOpacity?: number;
  /** Probability (0-1) that a dot starts in the "active" (glowing) state. */
  activeProbability?: number;
  /** Speed of the per-dot pulse animation. */
  pulseSpeed?: number;
  /** Shadow blur radius applied to active dots. */
  glowIntensity?: number;
  /**
   * Threshold that gates the random activation tick.
   * A new batch is triggered when `random() > randomActivationRate`,
   * so HIGHER values mean LESS frequent activations.
   */
  randomActivationRate?: number;
  /** How many dots are re-randomized per activation tick. */
  activationBatchSize?: number;
  /** Cap for `window.devicePixelRatio` when sizing the canvas. */
  maxDpr?: number;
  /** Custom random source (defaults to `Math.random`). Useful for tests. */
  random?: () => number;
  className?: string;
  style?: CSSProperties;
}

type ResolvedProps = Required<
  Omit<DotNeonGridProps, 'className' | 'style' | keyof HTMLAttributes<HTMLDivElement>>
>;

// ---------------------------------------------------------------------------
// Pure helpers (kept module-level to avoid recreating closures on every mount).
// ---------------------------------------------------------------------------

function buildDots(
  w: number,
  h: number,
  p: ResolvedProps,
): Dot[] {
  const spacing = p.dotSpacing;
  const cols = Math.max(4, Math.floor(w / spacing));
  const rows = Math.max(4, Math.floor(h / spacing));

  const totalW = (cols - 1) * spacing;
  const totalH = (rows - 1) * spacing;
  const startX = w / 2 - totalW / 2;
  const startY = h / 2 - totalH / 2;

  const dots: Dot[] = new Array(rows * cols);
  let idx = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      dots[idx++] = {
        x: startX + x * spacing,
        y: startY + y * spacing,
        active: p.random() < p.activeProbability,
        opacity: p.random() * 0.5 + 0.1,
        color: p.colors[Math.floor(p.random() * p.colors.length)],
        size: p.dotSize + p.random() * p.dotSizeVariance,
        pulse: p.random() * TWO_PI,
      };
    }
  }
  return dots;
}

function gridDimensions(w: number, h: number, spacing: number) {
  const cols = Math.max(4, Math.floor(w / spacing));
  const rows = Math.max(4, Math.floor(h / spacing));
  return { cols, rows };
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  cols: number,
  p: ResolvedProps,
) {
  ctx.strokeStyle = p.lineColor;
  ctx.globalAlpha = p.lineOpacity;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const len = dots.length;
  for (let i = 0; i < len; i++) {
    const dot = dots[i];
    if (i % cols !== cols - 1) {
      const next = dots[i + 1];
      ctx.moveTo(dot.x, dot.y);
      ctx.lineTo(next.x, next.y);
    }
    if (i + cols < len) {
      const below = dots[i + cols];
      ctx.moveTo(dot.x, dot.y);
      ctx.lineTo(below.x, below.y);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Draw all dots in two passes:
 *  1) inactive dots in a single batch (no shadow);
 *  2) active dots grouped by color, applying `shadowBlur` once per color.
 *
 * This keeps `shadowBlur` configuration out of the per-dot hot loop.
 */
function drawDots(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  timestamp: number,
  p: ResolvedProps,
  circlePath: Path2D,
) {
  const len = dots.length;

  // Group active dots by color so shadowBlur is set once per color.
  const activeByColor = new Map<string, Dot[]>();

  ctx.shadowBlur = 0;

  // Pass 1: inactive dots.
  for (let i = 0; i < len; i++) {
    const dot = dots[i];
    if (dot.active) {
      let bucket = activeByColor.get(dot.color);
      if (!bucket) {
        bucket = [];
        activeByColor.set(dot.color, bucket);
      }
      bucket.push(dot);
      continue;
    }

    const pulse = Math.sin(timestamp * p.pulseSpeed + dot.pulse) * PULSE_AMPLITUDE + PULSE_AMPLITUDE;
    const radius = dot.size + pulse * RADIUS_PULSE;

    ctx.globalAlpha = dot.opacity * INACTIVE_OPACITY_FACTOR;
    ctx.fillStyle = dot.color;
    ctx.save();
    ctx.translate(dot.x, dot.y);
    ctx.scale(radius / Math.max(p.dotSize, 0.0001), radius / Math.max(p.dotSize, 0.0001));
    ctx.fill(circlePath);
    ctx.restore();
  }

  // Pass 2: active dots grouped by color.
  for (const [color, bucket] of activeByColor) {
    ctx.fillStyle = color;
    ctx.shadowBlur = p.glowIntensity;
    ctx.shadowColor = color;

    for (let i = 0; i < bucket.length; i++) {
      const dot = bucket[i];
      const pulse = Math.sin(timestamp * p.pulseSpeed + dot.pulse) * PULSE_AMPLITUDE + PULSE_AMPLITUDE;
      const radius = dot.size + pulse * RADIUS_PULSE;
      const opacity = ACTIVE_OPACITY_BASE + pulse * ACTIVE_OPACITY_PULSE;

      ctx.globalAlpha = opacity;
      ctx.save();
      ctx.translate(dot.x, dot.y);
      ctx.scale(radius / Math.max(p.dotSize, 0.0001), radius / Math.max(p.dotSize, 0.0001));
      ctx.fill(circlePath);
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function triggerRandomActivation(dots: Dot[], p: ResolvedProps) {
  if (p.random() <= p.randomActivationRate) return;
  const len = dots.length;
  const batch = Math.max(1, p.activationBatchSize);
  for (let i = 0; i < batch; i++) {
    const d = dots[Math.floor(p.random() * len)];
    d.active = p.random() > 0.5;
    d.color = p.colors[Math.floor(p.random() * p.colors.length)];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DotNeonGrid = memo(({
  dotSpacing = 22,
  dotSize = 1.3,
  dotSizeVariance = 0.7,
  colors = ['#d9ff00', '#b026ff', '#7a00ff', '#ffffff'],
  backgroundColor = '#040816',
  lineColor = '#7800ff',
  lineOpacity = 0.08,
  activeProbability = 0.18,
  pulseSpeed = 0.0015,
  glowIntensity = 12,
  randomActivationRate = 0.96,
  activationBatchSize = 8,
  maxDpr = DEFAULT_MAX_DPR,
  random = Math.random,
  className = '',
  style,
  ...rest
}: DotNeonGridProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const gridRef = useRef({ cols: 0, rows: 0 });
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const rebuildRef = useRef<(() => void) | null>(null);

  // Memoized circle Path2D (reused for every dot via translate+scale).
  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null;
    const path = new Path2D();
    // Unit circle of radius `dotSize`; we scale per-dot in drawDots.
    path.arc(0, 0, dotSize, 0, TWO_PI);
    return path;
  }, [dotSize]);

  // Stable colors signature so a new array reference doesn't churn rebuilds.
  const colorsKey = useMemo(() => colors.join('|'), [colors]);

  // Single source of truth for resolved props read inside RAF.
  const propsRef = useRef<ResolvedProps>({
    dotSpacing,
    dotSize,
    dotSizeVariance,
    colors,
    backgroundColor,
    lineColor,
    lineOpacity,
    activeProbability,
    pulseSpeed,
    glowIntensity,
    randomActivationRate,
    activationBatchSize,
    maxDpr,
    random,
  });
  propsRef.current = {
    dotSpacing,
    dotSize,
    dotSizeVariance,
    colors,
    backgroundColor,
    lineColor,
    lineOpacity,
    activeProbability,
    pulseSpeed,
    glowIntensity,
    randomActivationRate,
    activationBatchSize,
    maxDpr,
    random,
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || !circlePath) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect prefers-reduced-motion.
    const motionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      reducedMotionRef.current = !!motionMedia?.matches;
    };
    updateMotion();
    motionMedia?.addEventListener?.('change', updateMotion);

    const doResize = () => {
      const rect = wrapper.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, propsRef.current.maxDpr);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      const { cols, rows } = gridDimensions(w, h, propsRef.current.dotSpacing);
      gridRef.current = { cols, rows };
      dotsRef.current = buildDots(w, h, propsRef.current);
    };

    // ResizeObserver on the wrapper (preferred over window resize).
    const ro = new ResizeObserver(doResize);
    ro.observe(wrapper);

    // Pause animation when offscreen; cancel RAF instead of polling visibility.
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisibleRef.current;
        isVisibleRef.current = entry.isIntersecting;
        if (!wasVisible && entry.isIntersecting && rafRef.current == null) {
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(wrapper);

    function tick(timestamp: number) {
      if (!isVisibleRef.current) {
        rafRef.current = null;
        return;
      }

      const { w, h } = sizeRef.current;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const p = propsRef.current;
      const dots = dotsRef.current;
      const { cols } = gridRef.current;

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = p.backgroundColor;
      ctx!.fillRect(0, 0, w, h);

      drawGridLines(ctx!, dots, cols, p);
      drawDots(ctx!, dots, timestamp, p, circlePath!);

      if (!reducedMotionRef.current) {
        triggerRandomActivation(dots, p);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    doResize();
    rafRef.current = requestAnimationFrame(tick);

    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        const { cols, rows } = gridDimensions(w, h, propsRef.current.dotSpacing);
        gridRef.current = { cols, rows };
        dotsRef.current = buildDots(w, h, propsRef.current);
      }
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      io.disconnect();
      motionMedia?.removeEventListener?.('change', updateMotion);
      rebuildRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circlePath]);

  // Rebuild the grid when geometry- or palette-affecting props change.
  useEffect(() => {
    rebuildRef.current?.();
  }, [dotSpacing, activeProbability, dotSize, dotSizeVariance, colorsKey]);

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={style}
      role="presentation"
      aria-hidden="true"
      {...rest}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
});

DotNeonGrid.displayName = 'DotNeonGrid';

export default DotNeonGrid;
