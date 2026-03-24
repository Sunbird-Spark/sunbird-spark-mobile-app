import React, { useState } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonContent, IonInput, IonSpinner, useIonRouter,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useContentSearch } from '../hooks/useContentSearch';
import useDebounce from '../hooks/useDebounce';
import { ContentSearchItem } from '../types/contentTypes';
import CollectionCard from '../components/content/CollectionCard';
import ResourceCard from '../components/content/ResourceCard';
import './SearchPage.css';
import useImpression from '../hooks/useImpression';

// ── Constants ──
const PREVIEW_LIMIT = 3;
const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

// ── Icons ──
const SearchInputIcon = () => (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
    </svg>
);

const ClearIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="var(--ion-color-medium, #757575)" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const SearchPage: React.FC = () => {
    useImpression({ pageid: 'SearchPage', env: 'search' });
    const router = useIonRouter();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery.trim(), 600);

    const { data, isLoading, error } = useContentSearch({
        request: debouncedQuery ? {
            query: debouncedQuery,
            limit: PREVIEW_LIMIT,
            filters: {
                status: ['Live'],
            },
        } : undefined,
        enabled: !!debouncedQuery,
    });

    const results = data?.data?.content || [];
    const totalCount = data?.data?.count || 0;

    const handleCancel = () => {
        if (router.canGoBack()) {
            router.goBack();
        } else {
            router.push('/home', 'back', 'replace');
        }
    };

    const handleClear = () => {
        setSearchQuery('');
    };

    const handleViewAllResults = () => {
        router.push(`/explore?query=${encodeURIComponent(debouncedQuery)}`, 'forward', 'push');
    };

    const renderResultCard = (item: ContentSearchItem) => {
        if (item.mimeType === COLLECTION_MIME_TYPE) {
            return <CollectionCard key={item.identifier} item={item} />;
        }
        return <ResourceCard key={item.identifier} item={item} />;
    };

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': 'var(--ion-color-light)', '--padding-top': 'env(safe-area-inset-top)', padding: '12px 16px', boxShadow: 'none' }}>
                    <div className="search-header">
                        <div className="search-input-box">
                            <SearchInputIcon />
                            <IonInput
                                type="text"
                                className="search-text-input"
                                placeholder={t('searchPlaceholder')}
                                value={searchQuery}
                                onIonInput={(e) => setSearchQuery(e.detail.value || '')}
                                autoFocus
                            />
                            {searchQuery && (
                                <button className="search-clear-btn" onClick={handleClear} aria-label={t('close')}>
                                    <ClearIcon />
                                </button>
                            )}
                        </div>
                        <button className="search-cancel-btn" onClick={handleCancel}>
                            {t('cancel')}
                        </button>
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen style={{ '--background': 'var(--ion-color-light)' }}>
                <div className="search-container">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="search-loading">
                            <IonSpinner name="crescent" />
                            <span>{t('searching')}</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="search-error">
                            <p>Search failed: {error.message}</p>
                        </div>
                    )}

                    {/* Search Results */}
                    {debouncedQuery && !isLoading && !error && results.length > 0 && (
                        <div className="search-results-section">
                            <h2 className="search-results-heading">
                                {t('searchResultsFor')} &quot;{debouncedQuery}&quot;
                            </h2>
                            <div className="search-results-row">
                                {results.map(renderResultCard)}
                            </div>
                            {totalCount > PREVIEW_LIMIT && (
                                <button className="search-view-all" onClick={handleViewAllResults}>
                                    {t('viewAllResults')} <ArrowRightIcon />
                                </button>
                            )}
                        </div>
                    )}

                    {/* No Results */}
                    {debouncedQuery && !isLoading && !error && results.length === 0 && (
                        <p className="search-no-results">{t('noResultsFor')} &quot;{debouncedQuery}&quot;</p>
                    )}

                    {/* Default State */}
                    {!debouncedQuery && !isLoading && (
                        <div className="recommended-section">
                            <h2 className="recommended-title">{t('searchPageHint')}</h2>
                        </div>
                    )}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default SearchPage;
