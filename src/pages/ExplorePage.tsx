import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    IonPage, IonHeader, IonToolbar, IonContent, IonModal,
    IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher,
    IonRefresherContent, IonSpinner,
} from '@ionic/react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { useContentSearch } from '../hooks/useContentSearch';
import { useFormRead } from '../hooks/useFormRead';
import useDebounce from '../hooks/useDebounce';
import type { ContentSearchItem } from '../types/contentTypes';
import type { ExploreFilterGroup, ExploreFilterOption, FilterState } from '../types/formTypes';
import CollectionCard from '../components/content/CollectionCard';
import ResourceCard from '../components/content/ResourceCard';
import './ExplorePage.css';

// ── Icons ──
const FilterIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2H16V0H2V2ZM2 3.58997V2H0V3.58997H2ZM6.41003 8L2 3.58997L0.589966 5L5 9.41003L6.41003 8ZM5 9.41003V16.3101H7V9.41003H5ZM5 16.3101C5 17.3301 5.99997 18.05 6.96997 17.73L6.33997 15.83C6.66997 15.72 7 15.9701 7 16.3101H5ZM6.96997 17.73L11.97 16.0601L11.34 14.17L6.33997 15.83L6.96997 17.73ZM11.97 16.0601C12.59 15.8601 13 15.29 13 14.64H11C11 14.42 11.14 14.23 11.34 14.17L11.97 16.0601ZM13 14.64V9.41003H11V14.64H13ZM16 3.58997L11.59 8L13 9.41003L17.41 5L16 3.58997ZM16 2V3.58997H18V2H16ZM17.41 5C17.79 4.62 18 4.11997 18 3.58997H16L17.41 5ZM13 9.41003L11.59 8C11.21 8.38 11 8.88003 11 9.41003H13ZM5 9.41003H7C7 8.88003 6.79003 8.38 6.41003 8L5 9.41003ZM0 3.58997C0 4.11997 0.209966 4.62 0.589966 5L2 3.58997H0ZM16 2H18C18 0.9 17.1 0 16 0V2ZM2 0C0.9 0 0 0.9 0 2H2V0Z" fill="var(--ion-color-primary)" />
    </svg>
);

const SearchIcon = () => (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="var(--ion-color-primary)" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 12H12.71L12.43 11.73C13.41 10.59 14 9.11 14 7.5C14 3.91 11.09 1 7.5 1C3.91 1 1 3.91 1 7.5C1 11.09 3.91 14 7.5 14C9.11 14 10.59 13.41 11.73 12.43L12 12.71V13.5L17 18.49L18.49 17L13.5 12ZM7.5 12C5.01 12 3 9.99 3 7.5C3 5.01 5.01 3 7.5 3C9.99 3 12 5.01 12 7.5C12 9.99 9.99 12 7.5 12Z" />
    </svg>
);

const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L13 13M13 1L1 13" stroke="var(--ion-color-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// ── Helpers ──
const COLLECTION_MIME_TYPE = 'application/vnd.ekstep.content-collection';

const SORT_OPTIONS = [
    { label: 'Newest First', value: { lastUpdatedOn: 'desc' } },
    { label: 'Oldest First', value: { lastUpdatedOn: 'asc' } },
];

const LIMIT = 9;

const getValues = (option: ExploreFilterOption): string[] =>
    Array.isArray(option.value) ? option.value : option.value ? [option.value] : [];

// ── Component ──
const ExplorePage: React.FC = () => {
    // ── Search ──
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 600);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ── Filters & Sort (applied immediately on selection, like the portal) ──
    const [filters, setFilters] = useState<FilterState>({});
    const [sortBy, setSortBy] = useState<Record<string, string>>({ lastUpdatedOn: 'desc' });

    // ── Filter Sheet state ──
    const [showFilter, setShowFilter] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('');

    // ── Pagination ──
    const [offset, setOffset] = useState(0);
    const [displayItems, setDisplayItems] = useState<ContentSearchItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const infiniteScrollRef = useRef<HTMLIonInfiniteScrollElement>(null);

    // ── Form read for filter groups ──
    const { data: formData, isLoading: isFormLoading } = useFormRead({
        request: {
            type: 'portal',
            subType: 'explorepage',
            action: 'filters',
            component: 'portal',
        },
    });

    const filterGroups: ExploreFilterGroup[] = useMemo(() => {
        const rawGroups = (formData?.data as any)?.form?.data?.filters;
        return Array.isArray(rawGroups) ? [...rawGroups].sort((a, b) => a.index - b.index) : [];
    }, [formData]);

    // Set the initial active tab when groups load
    useEffect(() => {
        if (filterGroups.length > 0 && !activeTab) {
            setActiveTab(filterGroups[0].id);
        }
    }, [filterGroups, activeTab]);

    // ── Build active filters for content search ──
    const activeFilters = useMemo(() => ({
        objectType: ['Content', 'QuestionSet'],
        ...Object.fromEntries(
            Object.entries(filters).filter(([, values]) => values.length > 0)
        ),
    }), [filters]);

    // ── Reset pagination when search params change ──
    useEffect(() => {
        setOffset(0);
        setDisplayItems([]);
        setHasMore(true);
    }, [debouncedQuery, activeFilters, sortBy]);

    // ── Content search ──
    const { data, isLoading: isQueryLoading, error: queryError, refetch } = useContentSearch({
        request: {
            limit: LIMIT,
            offset,
            query: debouncedQuery,
            sort_by: sortBy,
            filters: activeFilters,
        },
    });

    // ── Accumulate items as pages load ──
    useEffect(() => {
        const content = data?.data?.content ?? [];
        const questionSets = data?.data?.QuestionSet ?? [];
        const newItems = [...content, ...questionSets];

        if (data) {
            if (newItems.length < LIMIT) setHasMore(false);

            if (offset === 0) {
                setDisplayItems(newItems);
            } else {
                setDisplayItems((prev) => {
                    const existingIds = new Set(prev.map((i) => i.identifier));
                    return [...prev, ...newItems.filter((i) => !existingIds.has(i.identifier))];
                });
            }

            // Signal IonInfiniteScroll that load is complete
            infiniteScrollRef.current?.complete();
        }
    }, [data, offset]);

    // ── Handlers ──
    const handleLoadMore = () => {
        if (hasMore && !isQueryLoading) {
            setOffset((prev) => prev + LIMIT);
        } else {
            infiniteScrollRef.current?.complete();
        }
    };

    const handleRefresh = async (e: CustomEvent) => {
        setOffset(0);
        setDisplayItems([]);
        setHasMore(true);
        await refetch();
        (e.target as HTMLIonRefresherElement).complete();
    };

    const handleSearchToggle = () => {
        setShowSearch((prev) => {
            if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
            return !prev;
        });
        if (showSearch) setSearchQuery('');
    };

    const handleOpenFilter = () => {
        if (filterGroups.length > 0) setActiveTab(filterGroups[0].id);
        setShowFilter(true);
    };

    const handleClearFilters = () => {
        setFilters({});
        setSortBy({ lastUpdatedOn: 'desc' });
    };

    const handleCheckboxChange = (option: ExploreFilterOption, checked: boolean) => {
        const values = getValues(option);
        setFilters((prev) => {
            const current = prev[option.code] ?? [];
            const updated = checked
                ? [...new Set([...current, ...values])]
                : current.filter((v) => !values.includes(v));
            return { ...prev, [option.code]: updated };
        });
    };

    const isChecked = (option: ExploreFilterOption): boolean => {
        const values = getValues(option);
        const current = filters[option.code] ?? [];
        return values.every((v) => current.includes(v));
    };

    const getGroupItems = (group: ExploreFilterGroup): ExploreFilterOption[] =>
        [...(group.options ?? group.list ?? [])].sort((a, b) => a.index - b.index);

    // Split into masonry columns
    const leftCol = displayItems.filter((_, i) => i % 2 === 0);
    const rightCol = displayItems.filter((_, i) => i % 2 !== 0);

    const isInitialLoading = isQueryLoading && offset === 0 && displayItems.length === 0;
    const activeFilterCount = Object.values(filters).flat().length;

    // ── Active filter tab group ──
    const isSortTab = activeTab === '__sort__';
    const activeGroup = filterGroups.find((g) => g.id === activeTab);

    // All sidebar tabs = form groups + Sort By
    const sidebarTabs = [
        ...filterGroups.map((g) => ({ id: g.id, label: g.label })),
        { id: '__sort__', label: 'Sort By' },
    ];

    return (
        <IonPage>
            <IonHeader className="ion-no-border">
                <IonToolbar style={{ '--background': 'var(--ion-color-light)', '--padding-top': 'env(safe-area-inset-top)', padding: '16px 16px', boxShadow: '0 14px 14px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        {showSearch ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-f0f0f0, #f0f0f0)', borderRadius: '8px', padding: '6px 10px' }}>
                                <SearchIcon />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search content..."
                                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'Rubik', sans-serif", fontSize: '15px', color: 'var(--ion-color-dark, #222222)' }}
                                />
                                <button onClick={handleSearchToggle} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                    <CloseIcon />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 style={{ fontFamily: "'Rubik', sans-serif", fontSize: '18px', fontWeight: 600, color: 'var(--ion-color-dark, #222222)', margin: 0 }}>
                                    Start Exploring
                                </h1>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button onClick={handleSearchToggle} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                        <SearchIcon />
                                    </button>
                                    <button
                                        onClick={handleOpenFilter}
                                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', position: 'relative' }}
                                    >
                                        <FilterIcon />
                                        {activeFilterCount > 0 && (
                                            <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--ion-color-primary)', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                                {activeFilterCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen style={{ '--background': 'rgb(244, 244, 244)' }}>
                <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                    <IonRefresherContent />
                </IonRefresher>

                {isInitialLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <IonSpinner name="bubbles" color="primary" />
                    </div>
                )}

                {queryError && displayItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ion-color-medium, #757575)', fontFamily: "'Rubik', sans-serif" }}>
                        <p style={{ marginBottom: '12px' }}>Failed to load content</p>
                        <button
                            onClick={() => refetch()}
                            style={{ background: 'var(--ion-color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontFamily: "'Rubik', sans-serif" }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!isInitialLoading && !queryError && displayItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ion-color-medium, #757575)', fontFamily: "'Rubik', sans-serif" }}>
                        <p>No content found</p>
                    </div>
                )}

                {displayItems.length > 0 && (
                    <div className="masonry-grid">
                        <div className="masonry-col">
                            {leftCol.map((item) =>
                                item.mimeType === COLLECTION_MIME_TYPE
                                    ? <CollectionCard key={item.identifier} item={item} />
                                    : <ResourceCard key={item.identifier} item={item} />
                            )}
                        </div>
                        <div className="masonry-col">
                            {rightCol.map((item) =>
                                item.mimeType === COLLECTION_MIME_TYPE
                                    ? <CollectionCard key={item.identifier} item={item} />
                                    : <ResourceCard key={item.identifier} item={item} />
                            )}
                        </div>
                    </div>
                )}

                <div style={{ height: '100px' }} />

                <IonInfiniteScroll
                    ref={infiniteScrollRef}
                    onIonInfinite={handleLoadMore}
                    disabled={!hasMore || isInitialLoading}
                >
                    <IonInfiniteScrollContent loadingSpinner="bubbles" />
                </IonInfiniteScroll>
            </IonContent>

            <BottomNavigation />

            {/* ── Filter Bottom Sheet Modal ── */}
            <IonModal
                isOpen={showFilter}
                onDidDismiss={() => setShowFilter(false)}
                breakpoints={[0, 0.75, 1]}
                initialBreakpoint={0.75}
                className="filter-modal"
            >
                <div className="filter-sheet-container">
                    {/* Header */}
                    <div className="filter-sheet-header">
                        <h2>Filters</h2>
                        <button onClick={() => setShowFilter(false)} className="close-btn">
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="filter-sheet-body">
                        {/* Sidebar */}
                        <div className="filter-sidebar">
                            {isFormLoading
                                ? [1, 2, 3].map((n) => (
                                    <div key={n} style={{ margin: '12px', height: '20px', background: '#e0e0e0', borderRadius: '4px', animationName: 'pulse', animationDuration: '1.5s', animationIterationCount: 'infinite' }} />
                                ))
                                : sidebarTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        className={`filter-tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))
                            }
                        </div>

                        {/* Options Pane */}
                        <div className="filter-options">
                            {isSortTab && (
                                <div className="checkbox-list">
                                    {SORT_OPTIONS.map((opt) => {
                                        const isSelected = JSON.stringify(sortBy) === JSON.stringify(opt.value);
                                        return (
                                            <label key={opt.label} className="checkbox-item">
                                                <input
                                                    type="checkbox"
                                                    className="custom-checkbox"
                                                    checked={isSelected}
                                                    onChange={() => setSortBy(opt.value)}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {!isSortTab && activeGroup && (
                                <div className="checkbox-list">
                                    {getGroupItems(activeGroup).map((option) => (
                                        <label key={option.id} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                className="custom-checkbox"
                                                checked={isChecked(option)}
                                                onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {!isSortTab && !activeGroup && !isFormLoading && (
                                <p style={{ color: 'var(--ion-color-medium, #757575)', fontSize: '14px', margin: '4px 0' }}>
                                    No options available
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="filter-sheet-footer">
                        <button className="clear-filters-btn" onClick={handleClearFilters}>
                            Clear Filters
                        </button>
                        <button className="apply-filters-btn" onClick={() => setShowFilter(false)}>
                            Close
                        </button>
                    </div>
                </div>
            </IonModal>
        </IonPage>
    );
};

export default ExplorePage;
