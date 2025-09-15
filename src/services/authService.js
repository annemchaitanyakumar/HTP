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

            const token = cookieToken || userData?.accessToken;
            if (!token || !token.startsWith('Bearer ')) {
                console.log('[AuthService] Invalid token format');
                this.logout();
                return false;
            }

            if (tokenService.isTokenExpired(token)) {
                console.log('[AuthService] Token expired');
                this.logout();
                return false;
            }

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
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Registration failed');
        }

        return response.json();
    }

    async refreshToken() {
        return tokenService.refreshIfNeeded();
    }

    // New method for initiating forgot password
    async forgotPassword(email) {
        console.log('[AuthService] Initiating forgot password');
        const response = await fetch(`${API_BASE}/forgotpassword`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to send reset email');
        }

        return response.json();
    }

    // New method for validating reset OTP
    async validateResetOtp(email, otp) {
        console.log('[AuthService] Validating reset OTP');
        const response = await fetch(`${API_BASE}/validate-reset-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, otp })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Invalid OTP');
        }

        return response.json();
    }

    // New method for resetting password
    async resetPassword(email, newPassword) {
        console.log('[AuthService] Resetting password');
        const response = await fetch(`${API_BASE}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, newPassword })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to reset password');
        }

        return response.json();
    }
}

export const authService = new AuthService();