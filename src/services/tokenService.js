import { cookieUtils } from '@/utils/cookieUtils';

const TOKEN_EXPIRY = import.meta.env.VITE_TOKEN_EXPIRY || 900000; // 15 minutes default

class TokenService {
    constructor() {
        this.tokenKey = 'auth_token';
        this.userKey = 'auth_user';
        this.init();
    }

    init() {
        // Try to restore token from cookies first, then localStorage
        const token = cookieUtils.getCookie(this.tokenKey) || localStorage.getItem(this.tokenKey);
        const userData = localStorage.getItem(this.userKey);

        if (token && !this.isTokenExpired(token)) {
            this.setTokens(token, null, userData ? JSON.parse(userData) : null);
        } else {
            this.clearTokens();
        }
    }

    setTokens(accessToken, refreshToken, userData) {
        const token = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
        
        // Set in both cookie and localStorage for redundancy
        cookieUtils.setCookie(this.tokenKey, token, TOKEN_EXPIRY / (24 * 60 * 60 * 1000)); // Convert ms to days
        localStorage.setItem(this.tokenKey, token);
        
        if (userData) {
            localStorage.setItem(this.userKey, JSON.stringify(userData));
        }

        console.log('[TokenService] Tokens set successfully');
    }

    getAccessToken() {
        const token = cookieUtils.getCookie(this.tokenKey) || localStorage.getItem(this.tokenKey);
        if (token && !this.isTokenExpired(token)) {
            return token;
        }
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

    clearTokens() {
        cookieUtils.removeCookie(this.tokenKey);
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        console.log('[TokenService] Tokens cleared');
    }

    getUserInfo() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }
}

export const tokenService = new TokenService();