# Device Service

A service for managing device information using Capacitor's Device plugin. This service provides a consistent interface for accessing device ID and other device information across your **mobile application** (iOS/Android).

## Features

- **Device ID**: Get unique device identifier from native platforms
- **Device Information**: Access platform, model, OS version, manufacturer, etc.
- **Mobile-First**: Optimized for iOS and Android platforms
- **Reactive**: Subscribe to device state changes
- **Error Handling**: Robust error handling with fallbacks
- **Caching**: Efficient caching to avoid repeated native calls

## Usage

### Basic Usage

```typescript
import { deviceService } from '../services/device';

// Initialize the service (usually done once in your app)
await deviceService.init();

// Get hashed device ID (recommended for privacy)
const hashedDeviceId = await deviceService.getHashedDeviceId();
console.log('Hashed Device ID:', hashedDeviceId);

// Get raw device ID only (native platforms only)
const deviceId = await deviceService.getDeviceIdOnly();
console.log('Device ID:', deviceId);

// Get full device state
const deviceState = await deviceService.getState();
console.log('Device Info:', deviceState);
```

### Using with React Hook

```typescript
import { useDevice } from '../hooks/useDevice';

function MyComponent() {
  const { deviceId, platform, isLoading, error, isNative } = useDevice();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isNative) return <div>This feature requires a mobile device</div>;

  return (
    <div>
      <p>Device ID: {deviceId}</p>
      <p>Platform: {platform}</p>
    </div>
  );
}
```

### Subscribing to Changes

```typescript
import { deviceService } from '../services/device';

// Subscribe to device state changes
const unsubscribe = deviceService.subscribe((deviceState) => {
  console.log('Device state updated:', deviceState);
});

// Don't forget to unsubscribe when done
unsubscribe();
```

### Direct Service Usage

```typescript
import { deviceService } from '../services/device';

// Check if running on native platform
if (deviceService.isNativePlatform()) {
  console.log('Running on native platform');
  const deviceId = await deviceService.getDeviceIdOnly();
} else {
  console.log('Web platform - device features not available');
}

// Get current platform
const platform = deviceService.getPlatform();

// Force refresh device information
await deviceService.refresh();
```

## API Reference

### DeviceState

```typescript
type DeviceState = {
  deviceId: string;           // Unique device identifier (native only)
  platform: string;          // Platform (ios, android, web)
  model: string;             // Device model
  operatingSystem: string;   // Operating system name
  osVersion: string;         // OS version
  manufacturer: string;      // Device manufacturer
  isVirtual: boolean;        // Whether device is virtual/emulator
  webViewVersion: string;    // WebView version
};
```

### DeviceService Methods

#### `init(): Promise<void>`
Initializes the device service and loads device information. Only works on native platforms.

#### `getState(): Promise<DeviceState>`
Returns the current device state. Initializes if not already done.

#### `getDeviceIdOnly(): Promise<string>`
Convenience method to get just the device ID. Returns 'unknown' for non-native platforms.

#### `getHashedDeviceId(): Promise<string>`
Returns SHA1 hash of device ID for privacy protection. For web platforms, generates and persists a consistent device ID.

#### `clearWebDeviceId(): Promise<void>`
Clears the persisted web device ID (web platform only). Next call to getHashedDeviceId() will generate a new ID.

#### `subscribe(listener: (state: DeviceState) => void): () => void`
Subscribe to device state changes. Returns unsubscribe function.

#### `refresh(): Promise<void>`
Forces a refresh of device information.

#### `isNativePlatform(): boolean`
Returns true if running on a native platform (iOS/Android).

#### `getPlatform(): string`
Returns the current platform name.

## Platform-Specific Behavior

### Native Platforms (iOS/Android)
- Uses Capacitor Device plugin to get real device information
- Device ID comes from the native device identifier or UUID
- All device information is available and accurate

### Web Platform
- Shows info message that service is running on web platform with fallback values
- Limited functionality - only basic platform detection
- Device ID generates and persists a consistent web-specific identifier
- Most device information will be 'unknown'
- Hashed device ID provides consistent identification across sessions

## Error Handling

The service includes comprehensive error handling:

- **Initialization Errors**: Falls back to basic platform detection
- **Device ID Errors**: Returns 'unknown' as fallback
- **Non-Native Platforms**: Logs warning and provides minimal functionality

## Integration with App Initialization

It's recommended to initialize the device service early in your app lifecycle:

```typescript
// In your main App component or initialization code
import { deviceService } from './services/device';

async function initializeApp() {
  try {
    if (deviceService.isNativePlatform()) {
      await deviceService.init();
      console.log('Device service initialized');
    } else {
      console.log('Skipping device service - not on native platform');
    }
  } catch (error) {
    console.error('Failed to initialize device service:', error);
  }
}

initializeApp();
```

## Testing

The service includes comprehensive tests focused on mobile platforms. Run tests with:

```bash
npm run test src/services/device/
```

## Dependencies

- `@capacitor/device`: For native device information
- `@capacitor/core`: For platform detection and utilities

Both dependencies are already included in your project.

## Mobile-First Design

This service is specifically designed for mobile applications:

- **No localStorage dependencies** - relies purely on native device APIs
- **Native platform checks** - warns when used on non-native platforms  
- **Mobile-optimized caching** - efficient for mobile performance
- **Real device IDs** - uses actual device identifiers, not generated ones