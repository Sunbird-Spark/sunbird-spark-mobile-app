import { vi } from 'vitest';

// Mock for capacitor-read-native-setting plugin
export const CapacitorReadNativeSetting = {
  read: vi.fn().mockResolvedValue({ value: 'mock-value' })
};

export default CapacitorReadNativeSetting;