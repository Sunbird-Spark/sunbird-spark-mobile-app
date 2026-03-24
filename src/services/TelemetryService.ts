import { $t } from '@project-sunbird/telemetry-sdk';
import { v4 as uuidv4 } from 'uuid';
import { telemetryDbService } from './db/TelemetryDbService';
import { databaseService } from './db/DatabaseService';
import type { TelemetryDecoratorContext, TelemetryEventInput } from './TelemetryContext';

export type { TelemetryEventInput };

export class TelemetryService {
  // Current session id — always a UUID, set by initialize() and updated on login/logout
  private _sid = '';
  // Post-init context overrides (channel/rollup updated after login)
  private _contextOverrides: Record<string, any> = {};
  // B10 — UTM/campaign parameters
  private _campaignParameters: Array<{ id: string; type: string }> = [];
  // B11 — global correlation data
  private _globalCdata: Array<{ id: string; type: string }> = [];
  // Impression dedup
  private _lastImpressionPageId: string | null = null;
  private _lastImpressionTime = 0;

  // ── Initialization ──────────────────────────────────────────────────────────

  /**
   * Initialize the SDK once at app startup.
   * timeDiff is expected in milliseconds (server - client); converted to seconds for the SDK.
   */
  initialize(ctx: TelemetryDecoratorContext): void {
    this._sid = ctx.sid ?? '';

    $t.initialize({
      pdata: ctx.pdata,
      env: 'app',
      channel: ctx.channel || '',
      did: ctx.did,
      uid: ctx.uid ?? '',
      sid: this._sid,
      // Tags managed entirely via resetTags to avoid stacking on re-init
      tags: [],
      cdata: [],
      rollup: ctx.rollup || {},
      // SDK expects timeDiff in seconds; our ctx.timeDiff is in milliseconds
      timeDiff: ctx.timeDiff ? ctx.timeDiff / 1000 : 0,
      enableValidation: true,
      // batchsize: 1 → each event is dispatched to SQLite immediately
      batchsize: 1,
      dispatcher: {
        dispatch: (batch: any) => {
          const events: any[] = batch?.events || [];
          for (const event of events) {
            void this._persistEvent(event);
          }
        },
      },
    });

    if (ctx.tags?.length) {
      $t.resetTags(ctx.tags);
    }
  }

  // ── Context updates (called after login / logout) ───────────────────────────

  /**
   * Update actor (uid) or context (sid, channel, rollup) after the SDK is initialized.
   * Each field is applied to the SDK using the appropriate reset method.
   */
  updateContext(partial: Partial<TelemetryDecoratorContext>): void {
    if (partial.uid !== undefined) {
      $t.resetActor({ id: partial.uid, type: 'User' });
    }
    if (partial.sid !== undefined) {
      this._sid = partial.sid;
    }
    if (partial.channel !== undefined) {
      this._contextOverrides.channel = partial.channel;
    }
    if (partial.rollup !== undefined) {
      this._contextOverrides.rollup = partial.rollup;
    }
    if (partial.tags !== undefined) {
      $t.resetTags(partial.tags);
    }
  }

  // B10 — campaign/UTM parameters merged into every event's cdata
  updateCampaignParameters(params: Array<{ id: string; type: string }>): void {
    this._campaignParameters = params;
  }

  // B11 — global correlation data merged into every event's cdata
  populateGlobalCorRelationData(cdata: Array<{ id: string; type: string }>): void {
    this._globalCdata = cdata;
  }

  get isInitialized(): boolean {
    return $t.isInitialized;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Build the SDK `options` object for every event call.
   * Passes the merged cdata and any post-init context overrides (channel/rollup)
   * via options.context so the SDK stamps them onto the event.
   */
  private _buildOptions(input: TelemetryEventInput): Record<string, any> {
    const ctx: Record<string, any> = {
      sid: this._sid,
      cdata: [
        { id: this._sid, type: 'UserSession' },
        ...this._campaignParameters,
        ...this._globalCdata,
        ...(input.context?.cdata || []),
      ],
    };

    if (input.context?.env) ctx.env = input.context.env;
    if (this._contextOverrides.channel) ctx.channel = this._contextOverrides.channel;
    if (this._contextOverrides.rollup) ctx.rollup = this._contextOverrides.rollup;

    return {
      context: ctx,
      ...(input.object ? { object: input.object } : {}),
    };
  }

  /** Persist a fully-built SDK event object to the local SQLite telemetry table. */
  private async _persistEvent(event: any): Promise<void> {
    try {
      await databaseService.initialize();
      await telemetryDbService.insert({
        event_id: event.mid || uuidv4(),
        event: JSON.stringify(event),
        event_type: event.eid,
        timestamp: event.ets,
        priority: 1,
        synced: 0,
      });
    } catch (err) {
      console.error('[TelemetryService] Failed to persist event:', err);
    }
  }

  // ── Typed event methods ─────────────────────────────────────────────────────

  async impression(input: TelemetryEventInput): Promise<void> {
    const pageId = input.edata?.pageid as string | undefined;
    if (pageId) {
      const now = Date.now();
      if (this._lastImpressionPageId === pageId && now - this._lastImpressionTime < 3000) return;
      this._lastImpressionPageId = pageId;
      this._lastImpressionTime = now;
    }
    if (!$t.isInitialized) return;
    $t.impression(input.edata, this._buildOptions(input));
  }

  async interact(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.interact(input.edata, this._buildOptions(input));
  }

  async start(
    config: Record<string, any>,
    contentId: string,
    contentVer: string,
    data: Record<string, any>,
    options?: Omit<TelemetryEventInput, 'edata'>,
  ): Promise<void> {
    if (!$t.isInitialized) return;
    const sdkOptions = options ? this._buildOptions({ edata: {}, ...options }) : {};
    await $t.start(config, contentId, contentVer, data, sdkOptions);
  }

  async end(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.end(input.edata, this._buildOptions(input));
  }

  async error(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.error(input.edata, this._buildOptions(input));
  }

  async log(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.log(input.edata, this._buildOptions(input));
  }

  async audit(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.audit(input.edata, this._buildOptions(input));
  }

  async share(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.share(input.edata, this._buildOptions(input));
  }

  async feedback(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.feedback(input.edata, this._buildOptions(input));
  }

  // A10 — app backgrounded / interrupted
  async interrupt(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.interrupt(input.edata, this._buildOptions(input));
  }

  // A11 — session summary (dwell time, pageviews, interactions)
  async summary(input: TelemetryEventInput): Promise<void> {
    if (!$t.isInitialized) return;
    $t.summary(input.edata, this._buildOptions(input));
  }

  // ── Raw player event save ───────────────────────────────────────────────────

  /**
   * Persist a single telemetry event emitted by a player web component directly
   * to SQLite, bypassing the SDK (player already stamps its own mid/ets/actor).
   */
  async save(event: any): Promise<void> {
    if (!event) return;
    try {
      await databaseService.initialize();
      const eid: string = (
        event?.eid ?? event?.data?.eid ?? event?.type ?? 'UNKNOWN'
      ).toUpperCase();
      let eventJson: string;
      try {
        eventJson = JSON.stringify(event);
      } catch {
        eventJson = JSON.stringify({ eid, raw: '[non-serializable event]' });
      }
      await telemetryDbService.insert({
        event_id: uuidv4(),
        event: eventJson,
        event_type: eid,
        timestamp: typeof event?.ets === 'number' ? event.ets : Date.now(),
        priority: 1,
        synced: 0,
      });
    } catch (err) {
      console.error('[TelemetryService] Failed to save event:', err);
    }
  }
}

export const telemetryService = new TelemetryService();
