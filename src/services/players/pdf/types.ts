import type { PlayerContext, PlayerContextOverrides } from '../PlayerContextService';

export type PdfPlayerContextProps = PlayerContextOverrides;

export interface PdfPlayerMetadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  [key: string]: any;
}

export interface PdfPlayerConfig {
  context: PlayerContext;
  config: Record<string, any>;
  metadata: PdfPlayerMetadata;
}

export interface PdfPlayerEvent {
  type: string;
  data: any;
  playerId?: string;
  timestamp?: number;
}
