/**
 * Routes a push notification tap to the correct screen.
 * Called when the user taps a notification from the OS tray or inbox.
 *
 * Action type values are sent by the backend in the FCM payload and match the legacy app
 * constants (app.constant.ts → ActionType). The switch below mirrors the legacy
 * notification.service.ts routing logic and is the correct approach (not config-driven).
 *
 * TODO (follow-up PR): Resolve absolute Diksha URLs in the contentURL and extURL cases.
 * Currently router.push(url) is called directly, which only works for relative paths.
 * If the backend sends a full URL like https://diksha.gov.in/play/content/do_123,
 * the router will fail silently. The fix:
 *   1. Fetch DEEPLINK_CONFIG from the backend at startup (system setting — same source
 *      the legacy app used for deep link pattern matching).
 *   2. Build a URL → internal route resolver using those patterns, e.g.:
 *        /play/content/:id  →  /content/:id
 *        /learn/course/:id  →  /course-details/:id
 *   3. In the contentURL case, run the URL through the resolver first;
 *      if no pattern matches, open in external browser as fallback.
 *   The same resolver should also be used by the deep link handler
 *   (App.addListener('appUrlOpen', ...)) once that is implemented.
 *
 * Data shape (supports both FCM payload and in-app feed formats):
 *   data.actionType / data.action.type           — action type string
 *   data.actionData / data.action.additionalInfo — object with deepLink, identifier, contentURL etc.
 *
 * @param push         - internal navigation callback (router.push)
 * @param openExternal - external URL callback (window.open or Browser.open).
 *                       Used for extURL. Falls back to window.open if not provided.
 *                       Only called with validated http/https URLs.
 */

/** Returns true only for safe http/https URLs from push payloads. */
function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
export function routeNotification(
  data: Record<string, any>,
  push: (path: string) => void,
  openExternal?: (url: string) => void,
): void {
  if (!data) return;

  const actionType: string = data.actionType ?? data.action?.type ?? '';
  const actionData = data.actionData ?? data.action?.additionalInfo ?? {};
  const openUrl = openExternal ?? ((url: string) => window.open(url, '_system'));

  switch (actionType) {
    case 'certificateUpdate':
      push('/profile');
      break;

    case 'courseUpdate':
    case 'contentUpdate':
    case 'bookUpdate':
      if (actionData.identifier) {
        push(`/content/${actionData.identifier}`);
      }
      break;

    case 'extURL': {
      const url: string = actionData.deepLink ?? '';
      if (url && isSafeUrl(url)) openUrl(url);
      break;
    }

    case 'contentURL': {
      const url: string = actionData.contentURL ?? '';
      if (url) push(url);
      break;
    }

    case 'updateApp':
      window.dispatchEvent(new CustomEvent('push:update-app'));
      break;

    case 'search':
      push('/explore');
      break;

    default:
      push('/notifications');
      break;
  }
}
