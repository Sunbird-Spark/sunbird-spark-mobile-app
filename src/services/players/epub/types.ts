import type { PlayerContext, PlayerContextOverrides } from '../PlayerContextService';

export type EpubPlayerContextProps = PlayerContextOverrides;

export interface EpubPlayerMetadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  [key: string]: any;
}

export interface EpubPlayerConfig {
  context: PlayerContext;
  config: Record<string, any>;
  metadata: EpubPlayerMetadata;
}

export interface EpubPlayerEvent {
  type: string;
  data: any;
  playerId?: string;
  timestamp?: number;
}
