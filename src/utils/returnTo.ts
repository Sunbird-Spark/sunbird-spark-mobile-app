const KEY = 'auth_return_to';

/** Call before navigating to /sign-in. Validates path is a safe relative URL. */
export function saveReturnTo(path: string): void {
  if (path.startsWith('/') && !path.startsWith('//')) {
    sessionStorage.setItem(KEY, path);
  }
}

/** Read the stored returnTo without clearing it (guards may still intercept). */
export function peekReturnTo(): string {
  return sessionStorage.getItem(KEY) ?? '/home';
}

/** Read and clear the stored returnTo. Call at the final post-login navigation step. */
export function consumeReturnTo(): string {
  const path = sessionStorage.getItem(KEY) ?? '/home';
  sessionStorage.removeItem(KEY);
  return path;
}

/** Clear without navigating — use when abandoning the login flow (e.g. TnC dismissed). */
export function clearReturnTo(): void {
  sessionStorage.removeItem(KEY);
}
