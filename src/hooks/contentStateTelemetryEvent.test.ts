import { describe, expect, it } from 'vitest';
import {
  eventHasScore,
  extractSummary,
  normalizeScormAssessEvent,
  sumAssessEventTotals,
} from './contentStateTelemetryEvent';

describe('eventHasScore', () => {
  it('is true for a numeric edata.score (non-SCORM)', () => {
    expect(eventHasScore({ edata: { score: 8 } }, false)).toBe(true);
  });

  it('is false for a string score when not SCORM', () => {
    expect(eventHasScore({ edata: { score: '8' } }, false)).toBe(false);
  });

  it('coerces a string score for SCORM content', () => {
    expect(eventHasScore({ edata: { score: '95' } }, true)).toBe(true);
    expect(eventHasScore({ edata: { score: 'not-a-number' } }, true)).toBe(false);
  });

  it('checks the summary array too', () => {
    expect(eventHasScore({ edata: { summary: [{ score: 5 }] } as never }, false)).toBe(true);
  });

  it('unwraps the nested `data` player-event shape', () => {
    expect(eventHasScore({ data: { edata: { score: 8 } } }, false)).toBe(true);
  });

  it('is false for undefined or a raw string event', () => {
    expect(eventHasScore(undefined, false)).toBe(false);
    expect(eventHasScore({ data: 'renderer:question:submitscore' }, false)).toBe(false);
  });
});

describe('extractSummary', () => {
  it('reads edata.summary as an array', () => {
    expect(extractSummary({ edata: { summary: [{ progress: 100 }] } as never })).toEqual([{ progress: 100 }]);
  });

  it('wraps a single summary object into an array', () => {
    expect(extractSummary({ summary: { progress: 50 } as never })).toEqual([{ progress: 50 }]);
  });

  it('returns [] for a raw string event or no summary', () => {
    expect(extractSummary({ data: 'renderer:question:submitscore' })).toEqual([]);
    expect(extractSummary({})).toEqual([]);
  });
});

describe('normalizeScormAssessEvent', () => {
  it('coerces string score/maxscore to numbers', () => {
    const normalized = normalizeScormAssessEvent({
      edata: { score: '95', item: { maxscore: '100' } },
    }) as { edata: { score: unknown; item: { maxscore: unknown } } };
    expect(normalized.edata.score).toBe(95);
    expect(normalized.edata.item.maxscore).toBe(100);
  });

  it('passes through non-object input unchanged', () => {
    expect(normalizeScormAssessEvent(null)).toBeNull();
    expect(normalizeScormAssessEvent('x')).toBe('x');
  });

  it('passes through an event with no edata unchanged', () => {
    const event = { foo: 'bar' };
    expect(normalizeScormAssessEvent(event)).toBe(event);
  });
});

describe('sumAssessEventTotals', () => {
  it('sums edata.score and edata.item.maxscore across events', () => {
    const events = [
      { edata: { score: 1, item: { maxscore: 1 } } },
      { edata: { score: 0, item: { maxscore: 1 } } },
      { edata: { score: '1', item: { maxscore: '1' } } }, // SCORM-style strings
    ];
    expect(sumAssessEventTotals(events)).toEqual({ score: 2, maxScore: 3 });
  });

  it('ignores malformed entries', () => {
    expect(sumAssessEventTotals([null, 'x', {}, { edata: {} }])).toEqual({ score: 0, maxScore: 0 });
  });

  it('returns zero totals for an empty array', () => {
    expect(sumAssessEventTotals([])).toEqual({ score: 0, maxScore: 0 });
  });
});
