import { useFormRead } from './useFormRead';

interface QRScannerFormData {
  form?: {
    data?: {
      isEnabled?: boolean;
    };
  };
}

export function useQRScannerPreference() {
  const { data: formApiData, isLoading } = useFormRead({
    request: {
      type: 'user',
      subType: 'scanner',
      action: 'view',
      component: 'app',
    },
  });

  const formData = formApiData?.data as QRScannerFormData | undefined;
  const isEnabled = formData?.form?.data?.isEnabled ?? false;

  return { isEnabled, isLoading };
}
