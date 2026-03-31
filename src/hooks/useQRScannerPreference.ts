import { useFormRead } from './useFormRead';

export function useQRScannerPreference() {
  const { data: formApiData, isLoading } = useFormRead({
    request: {
      type: 'user',
      subType: 'scanner',
      action: 'view',
      component: 'app',
    },
  });

  const isEnabled = (formApiData?.data as any)?.form?.data?.isEnabled ?? false;

  return { isEnabled, isLoading };
}
