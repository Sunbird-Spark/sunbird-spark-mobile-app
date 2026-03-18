import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormService } from '../services/FormService';
import { AppInitializer } from '../AppInitializer';

const formService = new FormService();

const LANDING_PAGE_REQUEST = {
  type: 'page',
  subType: 'landing',
  action: 'sections',
  component: 'app',
  framework: '*',
  rootOrgId: '*',
};

export const useLandingPageConfig = () => {
  const [appInitialized, setAppInitialized] = useState(AppInitializer.isInitialized());

  useEffect(() => {
    if (appInitialized) return;
    const interval = setInterval(() => {
      if (AppInitializer.isInitialized()) {
        setAppInitialized(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [appInitialized]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['form-read', 'page', 'landing', 'sections'],
    queryFn: () => formService.formRead(LANDING_PAGE_REQUEST),
    enabled: appInitialized,
    staleTime: 60 * 60 * 1000,
  });

  const sections = useMemo(() => {
    console.log('[LandingPageConfig] Raw API response:', JSON.stringify(data?.data, null, 2));
    const raw = data?.data?.form?.data?.sections;
    if (!Array.isArray(raw)) return [];
    const sorted = [...raw].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    console.log('[LandingPageConfig] Sections:', sorted.map((s: any) => ({ type: s.type, title: s.title, index: s.index })));
    return sorted;
  }, [data]);

  return { sections, isLoading: isLoading || !appInitialized, isError };
};
