import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormService } from '../services/FormService';
import { AppInitializer } from '../AppInitializer';
import { resolveLabel } from '../utils/formLocaleResolver';

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
  const { i18n } = useTranslation();
  const lang = i18n.language;
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
    const raw = data?.data?.form?.data?.sections;
    if (!Array.isArray(raw)) return [];
    const sorted = [...raw].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));

    return sorted.map((section: any) => {
      const resolved: any = {
        ...section,
        title: resolveLabel(section.title, lang),
      };

      if (section.subtitle) {
        resolved.subtitle = resolveLabel(section.subtitle, lang);
      }

      if (section.type === 'categories' && Array.isArray(section.list)) {
        resolved.list = section.list.map((item: any) => ({
          ...item,
          title: resolveLabel(item.title, lang),
        }));
      }

      return resolved;
    });
  }, [data, lang]);

  return { sections, isLoading: isLoading || !appInitialized, isError };
};
