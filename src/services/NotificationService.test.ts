import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDateGroup, parseTemplateMessage } from './NotificationService';

describe('getDateGroup', () => {
  beforeEach(() => {
    // Fix "now" to 2026-03-24 14:00:00 local time
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 24, 14, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for a timestamp from today', () => {
    expect(getDateGroup('2026-03-24T09:30:00')).toBe('Today');
  });

  it('returns "Today" for a timestamp at midnight today', () => {
    expect(getDateGroup('2026-03-24T00:00:00')).toBe('Today');
  });

  it('returns "Yesterday" for a timestamp from yesterday', () => {
    expect(getDateGroup('2026-03-23T18:00:00')).toBe('Yesterday');
  });

  it('returns "Yesterday" for a timestamp at midnight yesterday', () => {
    expect(getDateGroup('2026-03-23T00:00:00')).toBe('Yesterday');
  });

  it('returns "Older" for a timestamp from two days ago', () => {
    expect(getDateGroup('2026-03-22T23:59:59')).toBe('Older');
  });

  it('returns "Older" for a timestamp from last week', () => {
    expect(getDateGroup('2026-03-17T10:00:00')).toBe('Older');
  });

  it('returns "Older" for a timestamp from a different year', () => {
    expect(getDateGroup('2025-12-31T23:59:59')).toBe('Older');
  });

  it('returns "Older" for an invalid date string', () => {
    // new Date('invalid') returns Invalid Date, which is NaN — all comparisons return false
    expect(getDateGroup('invalid-date')).toBe('Older');
  });

  it('returns "Older" for an empty string', () => {
    expect(getDateGroup('')).toBe('Older');
  });
});

describe('parseTemplateMessage', () => {
  it('returns description when both description and title are present', () => {
    const data = JSON.stringify({ title: 'Title', description: 'Description' });
    expect(parseTemplateMessage(data)).toBe('Description');
  });

  it('returns title when description is missing', () => {
    const data = JSON.stringify({ title: 'Title' });
    expect(parseTemplateMessage(data)).toBe('Title');
  });

  it('returns title when description is empty string', () => {
    const data = JSON.stringify({ title: 'Title', description: '' });
    expect(parseTemplateMessage(data)).toBe('Title');
  });

  it('returns raw string when JSON has neither title nor description', () => {
    const data = JSON.stringify({ other: 'value' });
    expect(parseTemplateMessage(data)).toBe(data);
  });

  it('returns raw string for invalid JSON', () => {
    expect(parseTemplateMessage('not valid json')).toBe('not valid json');
  });

  it('returns raw string for partial JSON', () => {
    expect(parseTemplateMessage('{"title": "broken')).toBe('{"title": "broken');
  });

  it('returns empty string for empty input', () => {
    expect(parseTemplateMessage('')).toBe('');
  });

  it('returns empty string for null-like input', () => {
    expect(parseTemplateMessage(null as unknown as string)).toBe('');
    expect(parseTemplateMessage(undefined as unknown as string)).toBe('');
  });
});
