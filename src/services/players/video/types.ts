import type { PlayerContext, PlayerContextOverrides } from '../PlayerContextService';

export type VideoPlayerContextProps = PlayerContextOverrides;

export interface VideoPlayerMetadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  [key: string]: any;
}

export interface VideoPlayerConfig {
  context: PlayerContext;
  config: Record<string, any>;
  metadata: VideoPlayerMetadata;
}

export interface VideoPlayerEvent {
  type: string;
  data: any;
  playerId?: string;
  timestamp?: number;
}
