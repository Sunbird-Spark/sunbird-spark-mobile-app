import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyLogoState, spawnParticles, drawParticles, Particle } from './dissolveParticles';

// ─── applyLogoState ───────────────────────────────────────────────────────────

describe('applyLogoState — classic', () => {
  it('phase 1 (p < 0.28): full opacity, no blur, scale 1', () => {
    const s = applyLogoState(0.1, 'classic');
    expect(s.opacity).toBe(1);
    expect(s.filter).toBe('none');
    expect(s.transform).toBe('scale(1.0000)');
  });

  it('phase 2 (0.28 ≤ p < 0.65): fading out with blur', () => {
    const s = applyLogoState(0.45, 'classic');
    expect(s.opacity as number).toBeGreaterThan(0);
    expect(s.opacity as number).toBeLessThan(1);
    expect(s.filter).toMatch(/blur\(/);
  });

  it('phase 3 (0.65 ≤ p < 0.78): fully invisible', () => {
    const s = applyLogoState(0.7, 'classic');
    expect(s.opacity).toBe(0);
  });

  it('phase 4 (p ≥ 0.78): fading back in', () => {
    const s = applyLogoState(0.9, 'classic');
    expect(s.opacity as number).toBeGreaterThan(0);
    expect(s.opacity as number).toBeLessThanOrEqual(1);
  });
});

describe('applyLogoState — ember', () => {
  it('phase 1 (p < 0.2): full opacity, no hue shift', () => {
    const s = applyLogoState(0.1, 'ember');
    expect(s.opacity).toBe(1);
    expect(s.filter).toMatch(/hue-rotate\(0\.0deg\)/);
  });

  it('phase 2 (0.2 ≤ p < 0.6): fading with glow', () => {
    const s = applyLogoState(0.4, 'ember');
    expect(s.opacity as number).toBeGreaterThan(0);
    expect(s.filter).toMatch(/brightness/);
  });

  it('phase 3 (0.6 ≤ p < 0.75): nearly invisible with max glow', () => {
    const s = applyLogoState(0.68, 'ember');
    expect(s.opacity as number).toBeLessThan(0.1);
  });

  it('phase 4 (p ≥ 0.75): fading back in', () => {
    const s = applyLogoState(0.88, 'ember');
    expect(s.opacity as number).toBeGreaterThan(0);
  });
});

describe('applyLogoState — shatter', () => {
  it('phase 1 (p < 0.22): full opacity, no skew', () => {
    const s = applyLogoState(0.1, 'shatter');
    expect(s.opacity).toBe(1);
    expect(s.filter).toBe('none');
    expect(s.transform).toBe('skewX(0.00deg) skewY(0.00deg)');
  });

  it('phase 2 (0.22 ≤ p < 0.55): fading with skew', () => {
    const s = applyLogoState(0.38, 'shatter');
    expect(s.opacity as number).toBeGreaterThan(0);
    expect(s.opacity as number).toBeLessThan(1);
  });

  it('phase 3 (0.55 ≤ p < 0.72): invisible', () => {
    const s = applyLogoState(0.63, 'shatter');
    expect(s.opacity).toBe(0);
    expect(s.filter).toBe('none');
  });

  it('phase 4 (p ≥ 0.72): reforming', () => {
    const s = applyLogoState(0.86, 'shatter');
    expect(s.opacity as number).toBeGreaterThan(0);
  });
});

describe('applyLogoState — melt', () => {
  it('phase 1 (p < 0.25): stable', () => {
    const s = applyLogoState(0.1, 'melt');
    expect(s.opacity).toBe(1);
    expect(s.filter).toBe('none');
    expect(s.transformOrigin).toBe('50% 100%');
  });

  it('phase 2 (0.25 ≤ p < 0.62): melting down', () => {
    const s = applyLogoState(0.43, 'melt');
    expect(s.opacity as number).toBeLessThan(1);
    expect(s.filter).toMatch(/blur\(/);
  });

  it('phase 3 (0.62 ≤ p < 0.76): invisible melted state', () => {
    const s = applyLogoState(0.69, 'melt');
    expect(s.opacity).toBe(0);
  });

  it('phase 4 (p ≥ 0.76): rising back', () => {
    const s = applyLogoState(0.88, 'melt');
    expect(s.opacity as number).toBeGreaterThan(0);
  });
});

describe('applyLogoState — ashes', () => {
  it('phase 1 (p < 0.2): full color', () => {
    const s = applyLogoState(0.1, 'ashes');
    expect(s.opacity).toBe(1);
    expect(s.filter).toMatch(/saturate\(1\.000\)/);
    expect(s.transform).toBe('none');
  });

  it('phase 2 (0.2 ≤ p < 0.58): desaturating', () => {
    const s = applyLogoState(0.38, 'ashes');
    expect(s.opacity as number).toBeLessThan(1);
    expect(s.filter).toMatch(/saturate/);
  });

  it('phase 3 (0.58 ≤ p < 0.74): invisible ashen', () => {
    const s = applyLogoState(0.66, 'ashes');
    expect(s.opacity).toBe(0);
  });

  it('phase 4 (p ≥ 0.74): restoring color', () => {
    const s = applyLogoState(0.87, 'ashes');
    expect(s.opacity as number).toBeGreaterThan(0);
  });
});

// ─── spawnParticles ───────────────────────────────────────────────────────────

describe('spawnParticles', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // always below spawn threshold
  });

  it('does nothing when particle count already exceeds 200', () => {
    const particles: Particle[] = Array.from({ length: 201 }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 1, decay: 0.01, life: 1, color: '#fff', type: 'circle',
    }));
    spawnParticles(0.5, 'classic', 400, 200, particles);
    expect(particles.length).toBe(201);
  });

  it('classic: spawns circle particles in active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.5, 'classic', 400, 200, particles);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.type).toBe('circle');
  });

  it('classic: no spawn outside active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.1, 'classic', 400, 200, particles);
    expect(particles.length).toBe(0);
  });

  it('ember: spawns glowing circle particles in active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.4, 'ember', 400, 200, particles);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.glow).toBe(true);
    expect(particles[0]?.type).toBe('circle');
  });

  it('ember: no spawn outside active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.8, 'ember', 400, 200, particles);
    expect(particles.length).toBe(0);
  });

  it('shatter: spawns rect particles in active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.4, 'shatter', 400, 200, particles);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.type).toBe('rect');
  });

  it('shatter: no spawn outside active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.8, 'shatter', 400, 200, particles);
    expect(particles.length).toBe(0);
  });

  it('melt: spawns teardrop particles in active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.43, 'melt', 400, 200, particles);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.type).toBe('teardrop');
  });

  it('melt: no spawn outside active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.8, 'melt', 400, 200, particles);
    expect(particles.length).toBe(0);
  });

  it('ashes: spawns square particles in active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.4, 'ashes', 400, 200, particles);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.type).toBe('square');
  });

  it('ashes: no spawn outside active phase', () => {
    const particles: Particle[] = [];
    spawnParticles(0.8, 'ashes', 400, 200, particles);
    expect(particles.length).toBe(0);
  });
});

// ─── drawParticles ────────────────────────────────────────────────────────────

describe('drawParticles', () => {
  const makeCtx = () => ({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
  } as unknown as CanvasRenderingContext2D);

  it('clears canvas each frame', () => {
    const ctx = makeCtx();
    drawParticles(ctx, 400, 200, []);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });

  it('removes dead particles (life ≤ 0)', () => {
    const particles: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, size: 2, alpha: 1, decay: 2, life: 0.001, color: '#f00', type: 'circle' },
    ];
    drawParticles(makeCtx(), 400, 200, particles);
    expect(particles.length).toBe(0);
  });

  it('draws circle particles', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 0, vy: 0, size: 3, alpha: 0.8, decay: 0.01, life: 0.9, color: '#dc7727', type: 'circle' },
    ];
    drawParticles(ctx, 400, 200, particles);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('draws circle particles with glow', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 0, vy: 0, size: 3, alpha: 0.8, decay: 0.01, life: 0.9, color: '#dc7727', type: 'circle', glow: true },
    ];
    drawParticles(ctx, 400, 200, particles);
    expect(ctx.shadowBlur).toBe(8);
  });

  it('draws rect particles with rotation', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 0, vy: 0, size: 3, alpha: 0.8, decay: 0.01, life: 0.9, color: '#bd4527', type: 'rect', rot: 0.5, rotV: 0.1, w: 8, h: 4 },
    ];
    drawParticles(ctx, 400, 200, particles);
    expect(ctx.rotate).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('draws square particles', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 50, y: 50, vx: 0, vy: 0, size: 2, alpha: 0.6, decay: 0.01, life: 0.8, color: '#7a2b14', type: 'square', rot: 0.2, rotV: 0.05 },
    ];
    drawParticles(ctx, 400, 200, particles);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('draws teardrop particles', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 80, y: 80, vx: 0, vy: 0.5, size: 4, alpha: 0.7, decay: 0.01, life: 0.85, color: '#dc7727', type: 'teardrop' },
    ];
    drawParticles(ctx, 400, 200, particles);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it('advances particle physics each frame (gravity applied)', () => {
    const ctx = makeCtx();
    const particles: Particle[] = [
      { x: 100, y: 100, vx: 1, vy: -1, size: 3, alpha: 0.8, decay: 0.01, life: 0.9, color: '#dc7727', type: 'circle' },
    ];
    const initialVy = particles[0]!.vy;
    drawParticles(ctx, 400, 200, particles);
    expect(particles[0]!.vy).toBeGreaterThan(initialVy); // gravity adds 0.04
    expect(particles[0]!.x).toBe(101); // vx applied
  });
});
