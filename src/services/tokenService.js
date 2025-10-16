const TOKEN_COOKIE = 'auth_token';
const USER_DATA_KEY = 'authData';

export default class TokenService {
    constructor() {
        console.log('[TokenService] Initializing');
        this.tokenKey = TOKEN_COOKIE;
        this.userKey = USER_DATA_KEY;
        this.init();
    }

    init() {
        const token = localStorage.getItem(this.tokenKey);
        const userData = localStorage.getItem(this.userKey);

        console.log('[TokenService] init token:', token, 'userData:', userData);

        if (token && !this.isTokenExpired(token)) {
            console.log('[TokenService] Valid token found');
            this.setTokens(token, null, userData ? JSON.parse(userData) : null);
            this.setAutoRefresh();
        } else {
            console.log('[TokenService] No valid token found, clearing tokens');
            this.clearTokens();
        }
    }

    setTokens(accessToken, _, userData) {
        const token = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
        console.log('[TokenService] Setting access token:', token);
        localStorage.setItem(this.tokenKey, token);

        if (userData) {
            userData.accessToken = token;
            localStorage.setItem(this.userKey, JSON.stringify(userData));
        }

        console.log('[TokenService] Access token set successfully');
        this.setAutoRefresh();
    }

    getAccessToken() {
        const token = localStorage.getItem(this.tokenKey);
        console.log('[TokenService] Getting access token:', token);
        if (token && !this.isTokenExpired(token)) {
            return token;
        }
        console.log('[TokenService] Token expired or missing');
        return null;
    }

    isTokenExpired(token) {
        if (!token) return true;
        try {
            const tokenParts = token.split(' ')[1];
            const payload = JSON.parse(atob(tokenParts.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeLeft = expirationTime - currentTime;

            console.log('[TokenService] Token expiry check:', {
                expires: new Date(expirationTime),
                timeLeft: Math.floor(timeLeft / 1000) + ' seconds'
            });

            return timeLeft <= 0;
        } catch (error) {
            console.error('[TokenService] Token validation error:', error);
            return true;
        }
    }

    willTokenExpireSoon(token = this.getAccessToken()) {
        if (!token) return true;
        try {
            const tokenParts = token.split(' ')[1];
            const payload = JSON.parse(atob(tokenParts.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeLeft = expirationTime - currentTime;

            return timeLeft <= 60000; // refresh if less than 1 min left
        } catch (error) {
            console.error('[TokenService] Token validation error:', error);
            return true;
        }
    }

    async refreshToken() {
        try {
            console.log('[TokenService] Attempting to refresh token');
            const response = await fetch('/api/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('[TokenService] Refresh failed:', response.status);
                this.clearTokens();
                return null;
            }

            const data = await response.json();
            console.log('[TokenService] Refresh token response:', data);

            if (data.accessToken) {
                const token = data.accessToken.startsWith('Bearer ')
                    ? data.accessToken
                    : `Bearer ${data.accessToken}`;

                const currentUser = this.getUserInfo() || {};
                currentUser.accessToken = token;

                this.setTokens(token, null, currentUser);
                console.log('[TokenService] Token refreshed successfully');
                return token;
            }
            return null;
        } catch (error) {
            console.error('[TokenService] Refresh token error:', error);
            return null;
        }
    }

    setAutoRefresh() {
        const token = this.getAccessToken();
        if (!token) return;

        try {
            console.log('[TokenService] Scheduling auto-refresh...');
            const tokenParts = token.split(' ')[1];
            const payload = JSON.parse(atob(tokenParts.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeLeft = expirationTime - currentTime;

            console.log('[TokenService] Token expires in (ms):', timeLeft);

            const refreshTime = Math.max(timeLeft - 60 * 1000, 0);
            console.log(`[TokenService] Token will be refreshed in ${Math.floor(refreshTime / 1000)} seconds`);

            if (refreshTime > 0) {
                setTimeout(async () => {
                    console.log('[TokenService] Auto-refresh triggered');
                    await this.refreshToken();
                }, refreshTime);
            }
        } catch (error) {
            console.error('[TokenService] Auto refresh scheduling error:', error);
        }
    }

    clearTokens() {
        console.log('[TokenService] Clearing tokens');
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    getUserInfo() {
        const userData = localStorage.getItem(this.userKey);
        console.log('[TokenService] Getting user info:', userData);
        return userData ? JSON.parse(userData) : null;
    }
}

export const tokenService = new TokenService();
