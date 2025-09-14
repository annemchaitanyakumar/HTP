import { tokenService } from './tokenService';
import { cookieUtils } from '@/utils/cookieUtils';

const API_BASE = '/api';
const TOKEN_COOKIE = 'auth_token';
const USER_DATA_KEY = 'authData';

class AuthService {
    async login(credentials) {
        console.log('[AuthService] Attempting login');
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Login failed');
        }

        const data = await response.json();
        console.log('[AuthService] Login successful');

        if (data.accessToken && data.userid) {
            const token = data.accessToken.startsWith('Bearer ') 
                ? data.accessToken 
                : `Bearer ${data.accessToken}`;
            
            const userData = {
                accessToken: token,
                userId: data.userid.toString(),
                role: data.role || 'CUSTOMER',
                email: data.emailid
            };

            // Store in multiple places for redundancy
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            cookieUtils.setCookie(TOKEN_COOKIE, token);
            
            tokenService.setTokens(
                token,
                data.refreshToken || null,
                userData.userId,
                userData.role
            );

            console.log('[AuthService] Auth data stored');
        }

        return data;
    }

    async restoreSession() {
        try {
            console.log('[AuthService] Attempting to restore session');
            
            // Try cookie first
            const cookieToken = cookieUtils.getCookie(TOKEN_COOKIE);
            const storedData = localStorage.getItem(USER_DATA_KEY);
            
            if (!cookieToken && !storedData) {
                console.log('[AuthService] No stored session found');
                return false;
            }

            let userData;
            if (storedData) {
                userData = JSON.parse(storedData);
            }

            // Validate token format
            const token = cookieToken || userData?.accessToken;
            if (!token || !token.startsWith('Bearer ')) {
                console.log('[AuthService] Invalid token format');
                this.logout();
                return false;
            }

            // Validate token expiration
            if (tokenService.isTokenExpired(token)) {
                console.log('[AuthService] Token expired');
                this.logout();
                return false;
            }

            // Restore session
            tokenService.setTokens(
                token,
                null,
                userData?.userId,
                userData?.role
            );

            console.log('[AuthService] Session restored successfully');
            return true;
        } catch (error) {
            console.error('[AuthService] Session restoration failed:', error);
            this.logout();
            return false;
        }
    }

    logout() {
        console.log('[AuthService] Logging out');
        localStorage.removeItem(USER_DATA_KEY);
        cookieUtils.removeCookie(TOKEN_COOKIE);
        tokenService.clearTokens();
    }

    async register(userData) {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',  // For consistency
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Registration failed');
        }

        return response.json();
    }

    async refreshToken() {
        // Delegate to tokenService (reuses the logic)
        return tokenService.refreshIfNeeded();
    }

    async forgotPassword(email) {
        const response = await fetch(`${API_BASE}/forgotpassword`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to send OTP');
        }
        return await response.text();
    }

    async validateResetOtp(email, otp) {
        const response = await fetch(`${API_BASE}/validate-reset-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to validate OTP');
        }
        return await response.text();
    }

    async resetPassword(email, newPassword) {
        const response = await fetch(`${API_BASE}/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to reset password');
        }
        return await response.text();
    }
}

export const authService = new AuthService();