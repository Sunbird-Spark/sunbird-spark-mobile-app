/**
 * NavigationHelperService
 *
 * Tracks page navigation timing and guards against duplicate navigation events.
 *
 *  - pageStartTime is set at module load and reset after each impression fires.
 *  - getPageLoadTime() returns elapsed seconds since the last pageStartTime.
 *  - storeUrlHistory() deduplicates same-URL navigations (handles refresh / same-page links)
 *    by popping the last entry, comparing, and only pushing both back when URLs differ.
 *  - shouldProcessNavigationClick() throttles rapid duplicate clicks on back/close buttons
 *    to 250ms.
 */
export class NavigationHelperService {
  private _pageStartTime: number = Date.now();

  public get pageStartTime(): number {
    return this._pageStartTime;
  }

  public resetPageStartTime(): void {
    this._pageStartTime = Date.now();
  }

  private _history: string[] = [];

  private _lastNavigationClickTime: number = 0;
  private readonly NAVIGATION_THROTTLE_MS = 250;

  public getPageLoadTime(): number {
    const pageEndTime = Date.now();
    return (pageEndTime - this._pageStartTime) / 1000;
  }

  /**
   * Deduplicates same-URL navigations.
   * Returns true when the URL is new (caller should fire an IMPRESSION),
   * false when it is a duplicate (caller should skip the IMPRESSION).
   */
  public storeUrlHistory(url: string): boolean {
    const previousUrl = this._history.pop();
    if (previousUrl === undefined || previousUrl === url) {
      this._history.push(url);
      return previousUrl === undefined;
    }
    this._history.push(previousUrl, url);
    return true;
  }

  public getPreviousUrl(): string | undefined {
    return this._history[this._history.length - 2];
  }

  /**
   * Throttle guard for back/close navigation buttons (250ms leading edge).
   */
  public shouldProcessNavigationClick(): boolean {
    const now = Date.now();
    if (now - this._lastNavigationClickTime < this.NAVIGATION_THROTTLE_MS) {
      return false;
    }
    this._lastNavigationClickTime = now;
    return true;
  }
}

export const navigationHelperService = new NavigationHelperService();
