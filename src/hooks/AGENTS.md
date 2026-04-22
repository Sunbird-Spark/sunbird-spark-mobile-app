# Hooks — Agent Guide

## What Lives Here

React Query wrappers. One hook per data concern.

```
hooks/
  useAppInitialized.ts          # Waits for AppInitializer to complete
  useBackButton.ts              # Android hardware back button handler
  useBatch.ts                   # Course batch details
  useBatchDownloadStates.ts     # Download state for all items in a batch
  useCollection.ts              # Collection (textbook) fetch
  useCollectionEnrollment.ts    # Enroll in a collection
  useConsent.ts                 # User data consent read/write
  useContent.ts                 # Single content item fetch
  useContentSearch.ts           # Content search query
  useContentStateUpdate.ts      # Update content_state in DB
  useCourseDownloadProgress.ts  # Aggregate download progress for a course
  useDIALScanner.ts             # QR/DIAL code scanner
  useDebounce.ts                # Debounce utility hook
  useDevice.ts                  # Device info
  useDownloadQueue.ts           # Download queue state
  useDownloadState.ts           # Single content download state
  useEditProfile.ts             # User profile update mutation
  useFaqData.ts                 # FAQ content fetch
  useForceSync.ts               # Force sync of course batch activity aggregates (once per batch, requires network)
  useFormRead.ts                # Dynamic form config fetch
  useImpression.ts              # Fire IMPRESSION telemetry event
  useInteract.ts                # Fire INTERACT telemetry event
  useIsContentLocal.ts          # Check if content is downloaded
  useLandingPageConfig.ts       # Landing page layout config
  useLocalContentSet.ts         # All locally downloaded content
  useNotifications.ts           # Push notification list
  useQRScannerPreference.ts     # QR scanner preference toggle
  useQumlContent.ts             # QuML assessment content fetch
  useRatingTimer.ts             # Content rating prompt timer
  useStorageInfo.ts             # Device storage stats
  useSystemSetting.ts           # Sunbird system setting fetch
  useTelemetry.ts               # Telemetry context builder hook
  useTnC.ts                     # Terms and conditions status
  useUser.ts                    # Current user profile
  useUserCertificates.ts        # User course certificates
  useUserEnrollment.ts          # User course enrollment list
```

---

## Patterns

All hooks that wrap `useQuery` or `useMutation` gate execution until the app and session are ready:

```typescript
const { data } = useQuery({
  queryKey: ['content', contentId],
  queryFn: () => contentService.getContent(contentId),
  enabled: !!contentId && !!userId && AppInitializer.isInitialized(),
  networkMode: 'offlineFirst',
});
```

- Query keys follow `['resource-name', id, ...params]`.
- `networkMode: 'offlineFirst'` on queries that must work without a connection.
- The `QueryProvider` sets a global 2-retry policy that skips retries on 4xx errors — do not override this per-query unless necessary.
- Custom return shapes use the `Use*Result` naming convention.

---

## Testing

Mock services at the module level; do not mock React Query internals:

```typescript
vi.mock('@/services/ContentService', () => ({
  contentService: { getContent: vi.fn() }
}));
```
