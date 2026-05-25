'use client';
import { useEffect, useMemo, useRef, memo } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';

const TWO_PI = Math.PI * 2;

// Visual tuning constants (extracted from magic numbers).
const ANGLE_LENGTH_BASE = Math.PI * 1.5;
const ANGLE_LENGTH_VARIANCE = Math.PI * 0.3;
const DEFAULT_MAX_DPR = 2;
const INTERSECTION_THRESHOLD = 0.15;

type Origin =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'left-center'
  | 'right-center'
  | 'bottom-center';

interface Arc {
  radius: number;
  angleOffset: number;
  angleLength: number;
  rotationSpeed: number;
  opacity: number;
}

export interface RotatingContoursProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Number of concentric arcs to draw. */
  numCurves?: number;
  /** Distance, in pixels, between consecutive arc radii. */
  radiusStep?: number;
  /** Stroke width of each arc, in pixels. */
  lineWidth?: number;
  /** Stroke color used for every arc. */
  strokeColor?: string;
  /** Canvas background fill. */
  backgroundColor?: string;
  /** Anchor point that all arcs rotate around. */
  origin?: Origin;
  /** Minimum per-frame rotation increment, in radians. May be negative. */
  rotationSpeedMin?: number;
  /** Maximum per-frame rotation increment, in radians. */
  rotationSpeedMax?: number;
  /** Minimum per-arc opacity (0-1). */
  opacityMin?: number;
  /** Maximum per-arc opacity (0-1). */
  opacityMax?: number;
  /** Cap for `window.devicePixelRatio` when sizing the canvas. */
  maxDpr?: number;
  /** Custom random source (defaults to `Math.random`). Useful for tests. */
  random?: () => number;
  className?: string;
  style?: CSSProperties;
}

type ResolvedProps = Required<
  Omit<RotatingContoursProps, 'className' | 'style' | keyof HTMLAttributes<HTMLDivElement>>
>;

// ---------------------------------------------------------------------------
// Pure helpers (kept module-level to avoid recreating closures on every mount).
// ---------------------------------------------------------------------------

function buildArcs(p: ResolvedProps): Arc[] {
  const arcs: Arc[] = new Array(p.numCurves);
  for (let i = 0; i < p.numCurves; i++) {
    arcs[i] = {
      radius: i * p.radiusStep,
      angleOffset: p.random() * TWO_PI,
      angleLength: ANGLE_LENGTH_BASE + p.random() * ANGLE_LENGTH_VARIANCE,
      rotationSpeed:
        p.rotationSpeedMin + p.random() * (p.rotationSpeedMax - p.rotationSpeedMin),
      opacity: p.opacityMin + p.random() * (p.opacityMax - p.opacityMin),
    };
  }
  return arcs;
}

function getOriginTranslation(w: number, h: number, origin: Origin): [number, number] {
  switch (origin) {
    case 'top-left':
      return [0, 0];
    case 'top-right':
      return [w, 0];
    case 'bottom-left':
      return [0, h];
    case 'bottom-right':
      return [w, h];
    case 'top-center':
      return [w / 2, 0];
    case 'left-center':
      return [0, h / 2];
    case 'right-center':
      return [w, h / 2];
    case 'bottom-center':
      return [w / 2, h];
    case 'center':
    default:
      return [w / 2, h / 2];
  }
}

function drawArcs(
  ctx: CanvasRenderingContext2D,
  arcs: Arc[],
  timestamp: number,
  p: ResolvedProps,
  translateX: number,
  translateY: number,
) {
  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.lineWidth = p.lineWidth;
  ctx.strokeStyle = p.strokeColor;

  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i];
    ctx.beginPath();
    ctx.globalAlpha = arc.opacity;
    ctx.arc(0, 0, arc.radius, arc.angleOffset, arc.angleOffset + arc.angleLength);
    ctx.stroke();

    arc.angleOffset += arc.rotationSpeed;
    if (arc.angleOffset > TWO_PI) {
      arc.angleOffset -= TWO_PI;
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RotatingContours = memo(({
  numCurves = 100,
  radiusStep = 24,
  lineWidth = 1.5,
  strokeColor = '#ffffff',
  backgroundColor = '#000000',
  origin = 'top-right',
  rotationSpeedMin = -0.002,
  rotationSpeedMax = 0.009,
  opacityMin = 0.15,
  opacityMax = 0.4,
  maxDpr = DEFAULT_MAX_DPR,
  random = Math.random,
  className = '',
  style,
  ...rest
}: RotatingContoursProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arcsRef = useRef<Arc[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const rebuildRef = useRef<(() => void) | null>(null);

  // Single source of truth for resolved props read inside RAF.
  const propsRef = useRef<ResolvedProps>({
    numCurves,
    radiusStep,
    lineWidth,
    strokeColor,
    backgroundColor,
    origin,
    rotationSpeedMin,
    rotationSpeedMax,
    opacityMin,
    opacityMax,
    maxDpr,
    random,
  });
  propsRef.current = {
    numCurves,
    radiusStep,
    lineWidth,
    strokeColor,
    backgroundColor,
    origin,
    rotationSpeedMin,
    rotationSpeedMax,
    opacityMin,
    opacityMax,
    maxDpr,
    random,
  };

  // Stable signature of geometry-affecting props so rebuilds only run when needed.
  const geometryKey = useMemo(
    () =>
      [
        numCurves,
        radiusStep,
        origin,
        rotationSpeedMin,
        rotationSpeedMax,
        opacityMin,
        opacityMax,
      ].join('|'),
    [numCurves, radiusStep, origin, rotationSpeedMin, rotationSpeedMax, opacityMin, opacityMax],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

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
      arcsRef.current = buildArcs(propsRef.current);
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
      { threshold: INTERSECTION_THRESHOLD },
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
      const arcs = arcsRef.current;
      const [tx, ty] = getOriginTranslation(w, h, p.origin);

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = p.backgroundColor;
      ctx!.fillRect(0, 0, w, h);

      drawArcs(ctx!, arcs, timestamp, p, tx, ty);

      rafRef.current = requestAnimationFrame(tick);
    }

    doResize();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      io.disconnect();
      motionMedia?.removeEventListener?.('change', updateMotion);
    };
  }, []);

  // Rebuild the arcs only when geometry-affecting props change.
  // Visual-only props (strokeColor, lineWidth, backgroundColor) are read
  // straight from `propsRef` inside the RAF tick, so no rebuild is needed.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (w > 0 && h > 0) {
      arcsRef.current = buildArcs(propsRef.current);
    }
  }, [geometryKey]);

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

RotatingContours.displayName = 'RotatingContours';

export default RotatingContours;
