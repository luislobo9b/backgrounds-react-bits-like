'use client';

import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

interface Dot {
  x: number;
  y: number;
  active: boolean;
  opacity: number;
  color: string;
  size: number;
  pulse: number;
}

interface DotNeonGridProps {
  // capabilities similar to DotGrid
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;

  // capabilities similar to DotField
  dotRadius?: number; // alias of dotSize for naming consistency (used as radius)
  dotSpacing?: number; // alias of gap/spacing
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;

  // neon-specific extras
  spacing?: number; // legacy alias for dotSpacing
  colors?: string[]; // palette
  backgroundColor?: string;
  lineColor?: string;
  lineOpacity?: number;
  activeProbability?: number;
  pulseSpeed?: number;
  glowIntensity?: number;
  randomActivationRate?: number;

  className?: string;
  style?: CSSProperties;
}

type PropsState = {
  // DotGrid-like
  dotSize: number;
  gap: number;
  baseColor: string;
  activeColor: string;
  proximity: number;
  speedTrigger: number;
  shockRadius: number;
  shockStrength: number;
  maxSpeed: number;
  resistance: number;
  returnDuration: number;

  // DotField-like
  dotRadius: number;
  dotSpacing: number;
  cursorRadius: number;
  cursorForce: number;
  bulgeOnly: boolean;
  bulgeStrength: number;
  glowRadius: number;
  sparkle: boolean;
  waveAmplitude: number;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;

  // Neon extras
  spacing: number;
  colors: string[];
  backgroundColor: string;
  lineColor: string;
  lineOpacity: number;
  activeProbability: number;
  pulseSpeed: number;
  glowIntensity: number;
  randomActivationRate: number;
};

const DotNeonGrid = memo(({
  // DotGrid-like defaults
  dotSize = 8,
  gap = 12,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 100,
  speedTrigger = 100,
  shockRadius = 150,
  shockStrength = 3,
  maxSpeed = 5000,
  resistance = 500,
  returnDuration = 1.2,

  // DotField-like defaults
  dotRadius,
  dotSpacing,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = 'rgba(168, 85, 247, 0.35)',
  gradientTo = 'rgba(180, 151, 207, 0.25)',
  glowColor = '#120F17',

  // Neon extras defaults
  spacing = 22,
  colors = ['#d9ff00', '#b026ff', '#7a00ff', '#ffffff'],
  backgroundColor = '#040816',
  lineColor = '#7800ff',
  lineOpacity = 0.08,
  activeProbability = 0.18,
  pulseSpeed = 0.0015,
  glowIntensity = 12,
  randomActivationRate = 0.96,

  className = '',
  style,
}: DotNeonGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const gridRef = useRef({ cols: 0, rows: 0 });
  const rafRef = useRef<number | null>(null);

  const propsRef = useRef<PropsState>({
    // DotGrid-like
    dotSize,
    gap,
    baseColor,
    activeColor,
    proximity,
    speedTrigger,
    shockRadius,
    shockStrength,
    maxSpeed,
    resistance,
    returnDuration,

    // DotField-like
    dotRadius: dotRadius ?? dotSize,
    dotSpacing: dotSpacing ?? gap,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    glowRadius,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
    glowColor,

    // Neon extras
    spacing,
    colors,
    backgroundColor,
    lineColor,
    lineOpacity,
    activeProbability,
    pulseSpeed,
    glowIntensity,
    randomActivationRate,
  });

  propsRef.current = {
    // DotGrid-like
    dotSize,
    gap,
    baseColor,
    activeColor,
    proximity,
    speedTrigger,
    shockRadius,
    shockStrength,
    maxSpeed,
    resistance,
    returnDuration,

    // DotField-like
    dotRadius: dotRadius ?? dotSize,
    dotSpacing: dotSpacing ?? gap,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    glowRadius,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
    glowColor,

    // Neon extras
    spacing,
    colors,
    backgroundColor,
    lineColor,
    lineOpacity,
    activeProbability,
    pulseSpeed,
    glowIntensity,
    randomActivationRate,
  };

  const buildGrid = () => {
    const p = propsRef.current;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;

    const cols = Math.max(2, Math.floor(w / p.spacing));
    const rows = Math.max(2, Math.floor(h / p.spacing));
    gridRef.current = { cols, rows };

    const totalW = (cols - 1) * p.spacing;
    const totalH = (rows - 1) * p.spacing;
    const startX = w / 2 - totalW / 2;
    const startY = h / 2 - totalH / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          x: startX + x * p.spacing,
          y: startY + y * p.spacing,
          active: Math.random() > 1 - p.activeProbability,
          opacity: Math.random() * 0.5 + 0.1,
          color: p.colors[Math.floor(Math.random() * p.colors.length)],
          size: Math.random() * 1.5 + 0.5,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    dotsRef.current = dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const doResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      sizeRef.current = { w, h };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid();
    };

    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 60);
    };

    const tick = (timestamp: number) => {
      const { w, h } = sizeRef.current;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const p = propsRef.current;
      const dots = dotsRef.current;

      ctx.clearRect(0, 0, w, h);

      // Background: use gradientFrom/gradientTo if provided, otherwise fallback to backgroundColor.
      // (App currently passes "red" strings; if it's not a valid CSS color/gradient, canvas will ignore.)
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, p.gradientFrom);
      grad.addColorStop(1, p.gradientTo);
      ctx.fillStyle = grad || p.backgroundColor;
      ctx.fillRect(0, 0, w, h);


      ctx.strokeStyle = p.lineColor;
      ctx.globalAlpha = p.lineOpacity;
      ctx.lineWidth = 1;

      const { cols } = gridRef.current;
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Horizontal connections
        if (i % cols !== cols - 1) {
          const next = dots[i + 1];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }

        // Vertical connections
        if (i + cols < dots.length) {
          const below = dots[i + cols];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(below.x, below.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      // Dots
      for (const dot of dots) {
        const pulse = Math.sin(timestamp * p.pulseSpeed + dot.pulse) * 0.5 + 0.5;
        const opacity = dot.active ? 0.3 + pulse * 0.9 : dot.opacity * 0.3;
        const radius = dot.size + pulse * 0.6;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = dot.active ? p.glowIntensity : 0;
        // glowColor prop should control the glow hue (App passes "red").
        ctx.shadowColor = p.glowColor || dot.color;

        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Random activation
      if (Math.random() > p.randomActivationRate) {
        for (let i = 0; i < 8; i++) {
          const d = dots[Math.floor(Math.random() * dots.length)];
          d.active = Math.random() > 0.5;
          d.color = p.colors[Math.floor(Math.random() * p.colors.length)];
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    resize();
    rafRef.current = requestAnimationFrame(tick);

    const parent = canvas.parentElement;
    let ro: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined' && parent) {
      ro = new ResizeObserver(() => resize());
      ro.observe(parent);
    } else {
      window.addEventListener('resize', resize);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    };
  }, []);

  // Rebuild ao trocar spacing/cores
  useEffect(() => {
    buildGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacing, activeProbability, colors]);

  return (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

DotNeonGrid.displayName = 'DotNeonGrid';

export default DotNeonGrid;

