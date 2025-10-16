import { tokenService } from './tokenService'; // ✅ IMPORT tokenService

const API_BASE = '/api';

class AuthService {
    verifyOtp = async (verificationData) => {
        console.log('[AuthService] Verify OTP called', verificationData);
        const response = await fetch(`${API_BASE}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationData)
        });

        if (!response.ok) {
            // Try to parse error as JSON first
            const errorText = await response.text();
            let error;
            try {
                error = JSON.parse(errorText);
                console.error('[AuthService] OTP verification failed', error);
                throw new Error(error.message || 'OTP verification failed');
            } catch (e) {
                // If parsing fails, use the raw text
                console.error('[AuthService] OTP verification failed', errorText);
                throw new Error(errorText || 'OTP verification failed');
            }
        }

        // Try to parse response as JSON first
        const responseText = await response.text();
        try {
            const data = JSON.parse(responseText);
            console.log('[AuthService] OTP verification response:', data);
            
            // If verification is successful and we have token data, set it up
            if (data.accessToken || data.token) {
                const token = (data.accessToken || data.token).startsWith('Bearer ')
                    ? (data.accessToken || data.token)
                    : `Bearer ${data.accessToken || data.token}`;

                const userData = {
                    accessToken: token,
                    userId: data.userid?.toString() || data.id?.toString(),
                    role: data.role || 'CUSTOMER',
                    email: data.emailid || data.email
                };

                localStorage.setItem('authData', JSON.stringify(userData));
                localStorage.setItem('auth_token', token);
                tokenService.setTokens(token, null, userData);
            }
            
            return data;
        } catch (e) {
            // If parsing fails, return the text response
            console.log('[AuthService] OTP verification response (text):', responseText);
            return { message: responseText };
        }
    };

    register = async (userData) => {
        console.log('[AuthService] Register called', userData);
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            // Try to parse error as JSON first
            const errorText = await response.text();
            let error;
            try {
                error = JSON.parse(errorText);
                console.error('[AuthService] Registration failed', error);
                throw new Error(error.message || 'Registration failed');
            } catch (e) {
                // If parsing fails, use the raw text
                console.error('[AuthService] Registration failed', errorText);
                throw new Error(errorText || 'Registration failed');
            }
        }

        // Try to parse response as JSON first
        const responseText = await response.text();
        try {
            const data = JSON.parse(responseText);
            console.log('[AuthService] Registration response:', data);
            return data;
        } catch (e) {
            // If parsing fails, return the text response
            console.log('[AuthService] Registration response (text):', responseText);
            return { message: responseText };
        }
    };

    login = async (credentials) => {
        console.log('[AuthService] Login called', credentials);

        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Login failed' }));
            console.error('[AuthService] Login failed', error);
            throw new Error(error.message);
        }

        const data = await response.json();
        console.log('[AuthService] Login response:', data);

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

            localStorage.setItem('authData', JSON.stringify(userData));
            localStorage.setItem('auth_token', token);
            tokenService.setTokens(token, null, userData);
        }

        return data;
    };

    refreshToken = async () => {
        console.log('[AuthService] Refresh token called');
        return await tokenService.refreshToken();
    };

    logout = () => {
        console.log('[AuthService] Logout called');
        localStorage.removeItem('authData');
        localStorage.removeItem('auth_token');
        tokenService.clearTokens();
    };

    restoreSession = async () => {
        console.log('[AuthService] restoreSession called');
        const token = localStorage.getItem('auth_token');
        const storedData = localStorage.getItem('authData');

        if (!token && !storedData) {
            console.log('[AuthService] No session found');
            return false;
        }

        let userData = storedData ? JSON.parse(storedData) : null;

        if (!token || tokenService.isTokenExpired(token)) {
            console.log('[AuthService] Token expired, refreshing...');
            const refreshed = await this.refreshToken();
            if (!refreshed) {
                this.logout();
                return false;
            }
        } else if (tokenService.willTokenExpireSoon(token)) {
            console.log('[AuthService] Token will expire soon, refreshing...');
            await this.refreshToken();
        }

        tokenService.setTokens(tokenService.getAccessToken(), null, userData);
        console.log('[AuthService] Session restored');
        return true;
    };

    forgotPassword = async (email) => {
        try {
            const response = await fetch(`${API_BASE}/forgotpassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email: email })
            });

            const responseText = await response.text();
            console.log('[AuthService] Forgot password response:', responseText);

            if (!response.ok) {
                throw new Error(responseText);
            }

            try {
                return JSON.parse(responseText);
            } catch (e) {
                return { message: responseText };
            }
        } catch (error) {
            console.error('[AuthService] Forgot password error:', error);
            throw error;
        }
    };

    validateResetOtp = async (email, otp) => {
        try {
            const response = await fetch(`${API_BASE}/validate-reset-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    email: email,
                    otp: otp 
                })
            });

            const responseText = await response.text();
            console.log('[AuthService] Validate reset OTP response:', responseText);

            if (!response.ok) {
                throw new Error(responseText);
            }

            try {
                return JSON.parse(responseText);
            } catch (e) {
                return { message: responseText };
            }
        } catch (error) {
            console.error('[AuthService] Validate reset OTP error:', error);
            throw error;
        }
    };

    resetPassword = async (email, newPassword) => {
        try {
            const response = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain, application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                    newPassword: newPassword
                })
            });

            const responseText = await response.text();
            console.log('[AuthService] Reset password response:', responseText);

            if (!response.ok) {
                throw new Error(responseText);
            }

            try {
                return JSON.parse(responseText);
            } catch (e) {
                return { message: responseText };
            }
        } catch (error) {
            console.error('[AuthService] Reset password error:', error);
            throw error;
        }
    };
}

export const authService = new AuthService();
