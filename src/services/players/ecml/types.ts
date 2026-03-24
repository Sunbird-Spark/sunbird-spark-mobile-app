import type { PlayerContext, PlayerContextOverrides } from '../PlayerContextService';

export type EcmlPlayerContextProps = PlayerContextOverrides;

export interface EcmlPlayerMetadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  mimeType?: string;
  contentType?: string;
  body?: Record<string, any>;
  [key: string]: any;
}

export interface EcmlPlayerConfig {
  context: PlayerContext;
  config: {
    showEndPage: boolean;
    endPage?: Array<{ template: string; contentType: string[] }>;
    showStartPage: boolean;
    host?: string;
    baseURL?: string;
    overlay: {
      showUser: boolean;
    };
    splash: {
      text: string;
      icon: string;
      bgImage: string;
      webLink: string;
    };
    apislug: string;
    devicePluginspath?: string;
    previewPluginspath?: string;
    build_number?: string;
    version?: string;
    repos?: string[];
    plugins: Array<{ id: string; ver: number; type: string }>;
    sideMenu: {
      showShare: boolean;
      showDownload: boolean;
      showExit: boolean;
      showPrint?: boolean;
      showReplay?: boolean;
    };
    enableTelemetryValidation: boolean;
  };
  metadata: EcmlPlayerMetadata;
  data: Record<string, any>;
}

export interface EcmlPlayerEvent {
  type: string;
  data: any;
  playerId?: string;
  timestamp?: number;
}
