import { useEffect, useRef } from 'react';
import { BURSTS, onCelebrate } from '../effects/confetti.ts';

const COLORS = ['#ff7a1f', '#ffd29a', '#3fcfbf', '#5fb4ff', '#a68cf0', '#ff6a50', '#5fd497', '#ffffff', '#ffd25a'];

// Fyzika podle osvědčeného canvas-confetti: rychlost s útlumem, gravitace, kývání a natáčení papírku.
interface Piece {
  x: number; y: number; velocity: number; angle: number; decay: number; gravity: number; drift: number;
  wobble: number; wobbleSpeed: number; tilt: number; tick: number; ticks: number; color: string; scalar: number; round: boolean;
}

function cannon(side: 'left' | 'right', count: number, width: number, height: number): Piece[] {
  const scale = Math.max(0.7, Math.min(1.6, height / 800));
  return Array.from({ length: count }, () => {
    const spread = 55 * Math.PI / 180, aim = (side === 'left' ? 60 : 120) * Math.PI / 180;
    const start = 50 * scale;
    return {
      x: side === 'left' ? width * 0.05 : width * 0.95, y: height * 1.02,
      velocity: start * 0.5 + Math.random() * start, angle: -aim + (0.5 * spread - Math.random() * spread),
      decay: 0.9, gravity: 3 * scale, drift: (Math.random() - 0.5) * 0.6,
      wobble: Math.random() * 10, wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
      tilt: (Math.random() * 0.5 + 0.25) * Math.PI, tick: 0, ticks: 220 + Math.random() * 60,
      color: COLORS[Math.floor(Math.random() * COLORS.length)], scalar: scale * (0.9 + Math.random() * 0.5), round: Math.random() < 0.25,
    };
  });
}

// Plátno přes celou obrazovku, které neblokuje klikání; kreslí jen během oslavy.
export default function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let pieces: Piece[] = [];
    let frame = 0;
    const timers: number[] = [];
    const draw = () => {
      const el = canvas.current, ctx = el?.getContext('2d');
      if (!el || !ctx) return;
      ctx.clearRect(0, 0, el.width, el.height);
      pieces = pieces.filter(p => p.tick < p.ticks && p.y < el.height + 60);
      for (const p of pieces) {
        p.x += Math.cos(p.angle) * p.velocity + p.drift;
        p.y += Math.sin(p.angle) * p.velocity + p.gravity;
        p.velocity *= p.decay;
        p.wobble += p.wobbleSpeed; p.tilt += 0.1; p.tick++;
        const wx = p.x + 10 * p.scalar * Math.cos(p.wobble), wy = p.y + 10 * p.scalar * Math.sin(p.wobble);
        const r = (Math.random() + 2) * p.scalar, tx = r * Math.cos(p.tilt), ty = r * Math.sin(p.tilt);
        ctx.globalAlpha = Math.max(0, 1 - p.tick / p.ticks);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.round) ctx.ellipse(p.x, p.y, Math.abs(wx - p.x) * 0.6 + 1, Math.abs(wy - p.y) * 0.6 + 1, Math.PI / 10 * p.wobble, 0, 2 * Math.PI);
        else { ctx.moveTo(p.x, p.y); ctx.lineTo(wx, p.y + ty); ctx.lineTo(wx + tx, wy + ty); ctx.lineTo(p.x + tx, wy); }
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = pieces.length ? requestAnimationFrame(draw) : 0;
    };
    const unsubscribe = onCelebrate(kind => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = canvas.current;
      if (!el) return;
      el.width = window.innerWidth; el.height = window.innerHeight;
      for (const [delay, count] of BURSTS[kind]) timers.push(window.setTimeout(() => {
        pieces.push(...cannon('left', count, el.width, el.height), ...cannon('right', count, el.width, el.height));
        if (!frame) frame = requestAnimationFrame(draw);
      }, delay));
    });
    return () => { unsubscribe(); cancelAnimationFrame(frame); timers.forEach(clearTimeout); };
  }, []);
  return <canvas ref={canvas} className="confetti-canvas" aria-hidden="true" />;
}
