export interface TelemetryDecoratorContext {
  did: string;
  sid: string;
  uid: string;
  channel: string;
  pdata: { id: string; ver: string; pid: string };
  timeDiff: number; // server - client clock skew in ms
  tags: string[];
  rollup: Record<string, string>;
  platform: string;
}

export interface TelemetryEventInput {
  edata: Record<string, any>;
  context?: {
    env?: string;
    cdata?: Array<{ id: string; type: string }>;
    [key: string]: any;
  };
  object?: {
    id: string;
    type: string;
    ver?: string;
    rollup?: Record<string, string>;
  };
}
