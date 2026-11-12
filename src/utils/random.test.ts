import { describe, it, expect, afterEach, vi } from 'vitest';
import { randomBetween, randomFloat, randomHex, randomInt, randomUUID } from './random';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomFloat', () => {
  it('stays within [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randomFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('refills its pool and keeps producing varied values across many draws', () => {
    // POOL_SIZE is 256, so 2000 draws force several refills.
    const values = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      values.add(randomFloat());
    }
    expect(values.size).toBeGreaterThan(1900);
  });

  it('uses crypto.getRandomValues rather than Math.random', () => {
    const mathSpy = vi.spyOn(Math, 'random');
    const cryptoSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    // Drain enough values to guarantee at least one pool refill.
    for (let i = 0; i < 300; i++) randomFloat();
    expect(cryptoSpy).toHaveBeenCalled();
    expect(mathSpy).not.toHaveBeenCalled();
    mathSpy.mockRestore();
    cryptoSpy.mockRestore();
  });
});

describe('randomBetween', () => {
  it('stays within [min, max)', () => {
    for (let i = 0; i < 500; i++) {
      const v = randomBetween(-2.5, 4);
      expect(v).toBeGreaterThanOrEqual(-2.5);
      expect(v).toBeLessThan(4);
    }
  });

  it('returns min for an empty range', () => {
    expect(randomBetween(3, 3)).toBe(3);
  });

  it('returns min for an inverted range', () => {
    expect(randomBetween(10, 2)).toBe(10);
  });
});

describe('randomInt', () => {
  it('returns integers within [min, maxExclusive)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randomInt(0, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      seen.add(v);
    }
    expect(seen.size).toBe(5);
  });

  it('returns min for an empty range', () => {
    expect(randomInt(7, 7)).toBe(7);
  });

  it('returns min for an inverted range', () => {
    expect(randomInt(7, 1)).toBe(7);
  });
});

describe('randomHex', () => {
  it('returns a lowercase hex string of the requested length', () => {
    expect(randomHex(16)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomHex(9)).toMatch(/^[0-9a-f]{9}$/);
  });

  it('returns an empty string for a non-positive length', () => {
    expect(randomHex(0)).toBe('');
    expect(randomHex(-4)).toBe('');
  });

  it('produces distinct values', () => {
    const values = new Set(Array.from({ length: 200 }, () => randomHex(16)));
    expect(values.size).toBe(200);
  });
});

describe('randomUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a v4 UUID', () => {
    expect(randomUUID()).toMatch(UUID_V4);
  });

  it('produces distinct values', () => {
    const values = new Set(Array.from({ length: 200 }, () => randomUUID()));
    expect(values.size).toBe(200);
  });

  it('falls back to getRandomValues when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    });
    expect(randomUUID()).toMatch(UUID_V4);
  });
});

describe('missing secure random source', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws instead of silently falling back to an insecure generator', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => randomHex(8)).toThrow(/crypto\.getRandomValues/);
    expect(() => randomUUID()).toThrow(/crypto\.getRandomValues/);
  });
});
