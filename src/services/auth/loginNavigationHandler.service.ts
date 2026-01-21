// src/services/auth/loginNavigationHandler.service.ts

/**
 * This service orchestrates the full login flow after a social provider
 * (Google, Apple, etc.) returns credentials.
 *
 * React equivalent of Angular login-navigation-handler.service.ts
 */

export type SessionProvider = {
    provide: () => Promise<any>;
};

class LoginNavigationHandlerService {
    /**
     * @param sessionProvider - provider that returns { idToken/accessToken/... }
     * @param skipNavigation - optional navigation params (like deep link return)
     * @param subType - auth subtype, e.g. 'GOOGLE'
     */
    async setSession(sessionProvider: SessionProvider, skipNavigation?: any, subType?: string) {
        // 1) Create session with backend
        // TODO: implement with your auth service
        // await authService.setSession(sessionProvider);

        // 2) Refresh profile + tenant data
        // TODO:
        // await profileService.setProfileDetailsAndRefresh(skipNavigation, subType);
        // await tenantService.refreshTenantData(...)

        // 3) Publish sign-in event
        // TODO:
        // eventBus.emit('SIGN_IN_RELOAD', skipNavigation);

        // 4) Navigate (optional)
        // TODO:
        // navigationService.navigateBack(skipNavigation);
        const payload = await sessionProvider.provide();

        console.log('[loginNavigationHandlerService] setSession called',
            {
                subType,
                skipNavigation,
                payload,
            });
            return payload
    }
}

export const loginNavigationHandlerService = new LoginNavigationHandlerService();
