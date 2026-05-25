'use client';

import { useEffect, useRef, memo } from 'react';

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
  gridSize?: number;
  spacing?: number;
  colors?: string[];
  backgroundColor?: string;
  lineColor?: string;
  lineOpacity?: number;
  activeProbability?: number;
  pulseSpeed?: number;
  glowIntensity?: number;
  randomActivationRate?: number;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

const DotNeonGrid = memo(({
  gridSize = 28,
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
  ...rest
}: DotNeonGridProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const propsRef = useRef<DotNeonGridProps>({});
  propsRef.current = {
    gridSize,
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

    const dots: Dot[] = [];
    const startX = w / 2 - (p.gridSize * p.spacing) / 2;
    const startY = h / 2 - (p.gridSize * p.spacing) / 2;

    for (let y = 0; y < p.gridSize; y++) {
      for (let x = 0; x < p.gridSize; x++) {
        dots.push({
          x: startX + x * p.spacing,
          y: startY + y * p.spacing,
          active: Math.random() > (1 - p.activeProbability),
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

    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 100);
    };

    const doResize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { w, h };
      buildGrid();
    };

    const tick = (timestamp: number) => {
      const p = propsRef.current;
      const dots = dotsRef.current;
      const { w, h } = sizeRef.current;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      timeRef.current = timestamp;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = p.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = p.lineColor;
      ctx.globalAlpha = p.lineOpacity;
      ctx.lineWidth = 1;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Horizontal
        if (i % p.gridSize !== p.gridSize - 1) {
          const next = dots[i + 1];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }

        // Vertical
        if (i + p.gridSize < dots.length) {
          const below = dots[i + p.gridSize];
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(below.x, below.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      // Dots
      dots.forEach((dot) => {
        const pulse = Math.sin(timestamp * p.pulseSpeed + dot.pulse) * 0.5 + 0.5;

        const opacity = dot.active
          ? 0.3 + pulse * 0.9
          : dot.opacity * 0.3;

        const radius = dot.size + pulse * 0.6;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);

        ctx.fillStyle = dot.color;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = dot.active ? p.glowIntensity : 0;
        ctx.shadowColor = dot.color;

        ctx.fill();

        // Reset
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

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

    doResize();
    window.addEventListener('resize', resize);

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Rebuild grid when relevant props change
  useEffect(() => {
    buildGrid();
  }, [gridSize, spacing, activeProbability]);

  return (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={style}
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