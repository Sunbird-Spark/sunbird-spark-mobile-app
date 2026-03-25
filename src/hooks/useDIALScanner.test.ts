import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @capacitor/barcode-scanner
const mockScanBarcode = vi.fn();
vi.mock('@capacitor/barcode-scanner', () => ({
  CapacitorBarcodeScanner: {
    scanBarcode: (...args: any[]) => mockScanBarcode(...args),
  },
  CapacitorBarcodeScannerTypeHint: { QR_CODE: 0 },
  CapacitorBarcodeScannerCameraDirection: { BACK: 1 },
  CapacitorBarcodeScannerScanOrientation: { PORTRAIT: 1 },
}));

// Mock @ionic/react
const mockPush = vi.fn();
vi.mock('@ionic/react', () => ({
  useIonRouter: () => ({ push: mockPush }),
}));

import { useDIALScanner } from './useDIALScanner';

describe('useDIALScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to ExplorePage with dialCode on valid DIAL URL (get/dial format)', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: 'https://www.sunbirded.org/get/dial/ABCDEF' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(mockPush).toHaveBeenCalledWith('/explore?dialCode=ABCDEF', 'forward', 'push');
    expect(result.current.alertType).toBeNull();
  });

  it('navigates with dialCode on /dial/ URL (no "get", test.sunbirded.org format)', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: 'https://test.sunbirded.org/dial/P8T3F9' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(mockPush).toHaveBeenCalledWith('/explore?dialCode=P8T3F9', 'forward', 'push');
    expect(result.current.alertType).toBeNull();
  });

  it('navigates with dialCode when scanned result has leading/trailing whitespace', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: '  https://test.sunbirded.org/dial/P8T3F9  \n' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(mockPush).toHaveBeenCalledWith('/explore?dialCode=P8T3F9', 'forward', 'push');
    expect(result.current.alertType).toBeNull();
  });

  it('navigates with dialCode when scanned result is a bare 6-char code', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: 'P8T3F9' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(mockPush).toHaveBeenCalledWith('/explore?dialCode=P8T3F9', 'forward', 'push');
    expect(result.current.alertType).toBeNull();
  });

  it('sets invalidQR alert on non-DIAL URL', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: 'https://www.example.com/something' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBe('invalidQR');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('exits silently when ScanResult is empty (user cancelled)', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: '' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('exits silently when ScanResult is only whitespace', async () => {
    mockScanBarcode.mockResolvedValue({ ScanResult: '   \n  ' });

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sets cameraDenied alert when scanBarcode throws a permission error', async () => {
    mockScanBarcode.mockRejectedValue(
      new Error("Couldn't scan because camera access wasn't provided. Check your camera permissions and try again.")
    );

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBe('cameraDenied');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('exits silently when user cancels the scanner (close button)', async () => {
    mockScanBarcode.mockRejectedValue(
      new Error("Couldn't scan because the process was cancelled.")
    );

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('resets alertType to null when dismissAlert is called', async () => {
    mockScanBarcode.mockRejectedValue(new Error('denied'));

    const { result } = renderHook(() => useDIALScanner());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.alertType).toBe('cameraDenied');

    act(() => {
      result.current.dismissAlert();
    });

    expect(result.current.alertType).toBeNull();
  });

  it('sets isScanning to true while pending and false once resolved', async () => {
    let resolve: (value: any) => void;
    mockScanBarcode.mockImplementation(
      () => new Promise((res) => { resolve = res; })
    );

    const { result } = renderHook(() => useDIALScanner());

    act(() => {
      result.current.startScan();
    });

    expect(result.current.isScanning).toBe(true);

    await act(async () => {
      resolve!({ ScanResult: '' });
    });

    expect(result.current.isScanning).toBe(false);
  });
});
