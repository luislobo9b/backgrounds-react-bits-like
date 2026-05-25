'use client';
import { useEffect, useMemo, useRef, memo } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';

const DEFAULT_MAX_DPR = 2;
const INTERSECTION_THRESHOLD = 0.15;

export interface AnimatedSquareGridProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** Size of each square in pixels. */
  squareSize?: number;
  /** Gap between squares in pixels. */
  gridGap?: number;
  /** Probability (0-1) that a square flickers per second. */
  flickerChance?: number;
  /** Color of the squares (CSS color string). */
  color?: string;
  /** Maximum opacity for squares (0-1). */
  maxOpacity?: number;
  /** Canvas background fill. */
  backgroundColor?: string;
  /** Cap for `window.devicePixelRatio` when sizing the canvas. */
  maxDpr?: number;
  className?: string;
  style?: CSSProperties;
}

type ResolvedProps = Required<
  Omit<AnimatedSquareGridProps, 'className' | 'style' | keyof HTMLAttributes<HTMLDivElement>>
>;

// ---------------------------------------------------------------------------
// Pure helpers (kept module-level to avoid recreating closures on every mount).
// ---------------------------------------------------------------------------

function parseColor(color: string): [number, number, number] {
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return [0, 255, 255];
  return [Number(match[0]), Number(match[1]), Number(match[2])];
}

function buildSquares(total: number, maxOpacity: number): Float32Array {
  const squares = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    squares[i] = Math.random() * maxOpacity;
  }
  return squares;
}

function gridDimensions(w: number, h: number, spacing: number) {
  const cols = Math.max(1, Math.floor(w / spacing));
  const rows = Math.max(1, Math.floor(h / spacing));
  return { cols, rows };
}

function updateSquares(squares: Float32Array, deltaTime: number, flickerChance: number, maxOpacity: number) {
  for (let i = 0; i < squares.length; i++) {
    if (Math.random() < flickerChance * deltaTime) {
      squares[i] = Math.random() * maxOpacity;
    }
  }
}

function drawSquares(
  ctx: CanvasRenderingContext2D,
  squares: Float32Array,
  cols: number,
  rows: number,
  p: ResolvedProps,
  dpr: number,
) {
  const [r, g, b] = parseColor(p.color);
  const stepX = (p.squareSize + p.gridGap) * dpr;
  const stepY = stepX;
  const size = p.squareSize * dpr;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const opacity = squares[x * rows + y];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      ctx.fillRect(x * stepX, y * stepY, size, size);
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedSquareGrid = memo(({
  squareSize = 1,
  gridGap = 9,
  flickerChance = 0.3,
  color = 'rgb(0, 255, 255)',
  maxOpacity = 0.3,
  backgroundColor = '#000000',
  maxDpr = DEFAULT_MAX_DPR,
  className = '',
  style,
  ...rest
}: AnimatedSquareGridProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const squaresRef = useRef<Float32Array>(new Float32Array(0));
  const sizeRef = useRef({ w: 0, h: 0 });
  const gridRef = useRef({ cols: 0, rows: 0 });
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const lastTimeRef = useRef<number>(0);
  const rebuildRef = useRef<(() => void) | null>(null);

  // Stable colors signature so a new string reference doesn't churn rebuilds.
  const colorsKey = useMemo(() => color, [color]);

  // Single source of truth for resolved props read inside RAF.
  const propsRef = useRef<ResolvedProps>({
    squareSize,
    gridGap,
    flickerChance,
    color,
    maxOpacity,
    backgroundColor,
    maxDpr,
  });
  propsRef.current = {
    squareSize,
    gridGap,
    flickerChance,
    color,
    maxOpacity,
    backgroundColor,
    maxDpr,
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

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

      const { cols, rows } = gridDimensions(w, h, propsRef.current.squareSize + propsRef.current.gridGap);
      gridRef.current = { cols, rows };
      squaresRef.current = buildSquares(cols * rows, propsRef.current.maxOpacity);
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
          lastTimeRef.current = performance.now();
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: INTERSECTION_THRESHOLD },
    );
    io.observe(wrapper);

    function tick(time: number) {
      if (!isVisibleRef.current) {
        rafRef.current = null;
        return;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const { w, h } = sizeRef.current;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const p = propsRef.current;
      const squares = squaresRef.current;
      const { cols, rows } = gridRef.current;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = p.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      updateSquares(squares, deltaTime, p.flickerChance, p.maxOpacity);
      drawSquares(ctx, squares, cols, rows, p, Math.min(window.devicePixelRatio || 1, p.maxDpr));

      rafRef.current = requestAnimationFrame(tick);
    }

    doResize();
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        const { cols, rows } = gridDimensions(w, h, propsRef.current.squareSize + propsRef.current.gridGap);
        gridRef.current = { cols, rows };
        squaresRef.current = buildSquares(cols * rows, propsRef.current.maxOpacity);
      }
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro.disconnect();
      io.disconnect();
      rebuildRef.current = null;
    };
  }, []);

  // Rebuild the grid when geometry-affecting props change.
  useEffect(() => {
    rebuildRef.current?.();
  }, [squareSize, gridGap, maxOpacity, colorsKey]);

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

AnimatedSquareGrid.displayName = 'AnimatedSquareGrid';

export default AnimatedSquareGrid;
