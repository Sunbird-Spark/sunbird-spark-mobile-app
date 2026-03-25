import { useState } from 'react';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { useIonRouter } from '@ionic/react';

type AlertType = null | 'cameraDenied' | 'invalidQR';

const DIAL_CODE_URL_REGEX = /\/(?:get\/)?dial\/([a-zA-Z0-9]+)/i;
const DIAL_CODE_BARE_REGEX = /^[a-zA-Z0-9]{6}$/;

function extractDialCode(scanned: string): string | null {
  const urlMatch = DIAL_CODE_URL_REGEX.exec(scanned);
  if (urlMatch) return urlMatch[1];
  if (DIAL_CODE_BARE_REGEX.test(scanned)) return scanned;
  return null;
}

export function useDIALScanner() {
  const router = useIonRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>(null);

  const startScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.PORTRAIT,
      });

      const scanned = result.ScanResult?.trim();

      if (!scanned) return;

      const dialCode = extractDialCode(scanned);
      if (!dialCode) {
        setAlertType('invalidQR');
        return;
      }

      router.push(`/explore?dialCode=${encodeURIComponent(dialCode)}`, 'forward', 'push');
    } catch (err: any) {
      const message: string = err?.message ?? '';
      if (message.includes('cancelled') || message.includes('canceled')) return;
      setAlertType('cameraDenied');
    } finally {
      setIsScanning(false);
    }
  };

  const dismissAlert = () => setAlertType(null);

  return { isScanning, alertType, startScan, dismissAlert };
}
