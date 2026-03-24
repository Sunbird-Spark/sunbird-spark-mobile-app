import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sunbird.app',
  appName: 'Sunbird Spark App',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
    },
  },
};

export default config;
