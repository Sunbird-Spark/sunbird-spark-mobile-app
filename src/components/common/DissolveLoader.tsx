import React, { useEffect, useRef, useState } from 'react';
import { GhostLogo, MainLogo } from './dissolveLogo';
import {
  DissolveLoaderProps,
  CYCLE,
  Particle,
  applyLogoState,
  spawnParticles,
  drawParticles,
} from './dissolveParticles';

export function DissolveLoader({ message, subVariant = 'classic' }: DissolveLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ t: number; lastTs: number; particles: Particle[]; raf: number }>({ t: 0, lastTs: 0, particles: [], raf: 0 });
  const [logoStyle, setLogoStyle] = useState<React.CSSProperties>({});

  const lastVariant = useRef(subVariant);

  useEffect(() => {
    const state = stateRef.current;

    if (lastVariant.current !== subVariant) {
      state.particles = [];
      lastVariant.current = subVariant;
      setLogoStyle({});
    }

    if (state.lastTs === 0) {
      state.t = 0; state.lastTs = 0; state.particles = [];
    }

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const canvas = canvasRef.current; const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    function loop(ts: number) {
      if (state.lastTs === 0) state.lastTs = ts;
      const dt = ts - state.lastTs; state.lastTs = ts;

      state.t = (state.t + dt / CYCLE) % 1;
      const t = state.t;

      setLogoStyle(applyLogoState(t, subVariant));

      const canvas = canvasRef.current;
      if (canvas && wrapRef.current) {
        const ctx = canvas.getContext('2d');
        const rect = wrapRef.current.getBoundingClientRect();
        if (ctx) {
          spawnParticles(t, subVariant, rect.width, rect.height, state.particles);
          drawParticles(ctx, rect.width, rect.height, state.particles);
        }
      }
      state.raf = window.requestAnimationFrame(loop);
    }

    state.raf = window.requestAnimationFrame(loop);
    return () => { window.cancelAnimationFrame(state.raf); window.removeEventListener('resize', resize); };
  }, [subVariant]);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3rem', width: '100%', height: '100%', position: 'relative' }}
      data-testid="dissolve-loader"
    >
      <div className="dissolve-loader-glow" />
      <div
        ref={wrapRef}
        style={{ position: 'relative', width: 'min(25rem, 80vw)', aspectRatio: '1110 / 580' }}
      >
        <GhostLogo />
        <div style={{ ...logoStyle, position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <MainLogo />
        </div>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
