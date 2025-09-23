import { tokenService } from './tokenService';
import { cookieUtils } from '@/utils/cookieUtils';

const API_BASE = '/api';
const TOKEN_COOKIE = 'auth_token';
const USER_DATA_KEY = 'authData';

class AuthService {
  constructor() {
    // No need to bind methods when using arrow functions
  }

  login = async (credentials) => {
    console.log('[AuthService] Attempting login with credentials:', credentials);
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
      const contentType = response.headers.get('content-type');
      let errorMessage;
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.message || 'Login failed';
      } else {
        errorMessage = await response.text() || 'Login failed';
      }
      console.error('[AuthService] Login failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[AuthService] Login successful, response:', data);

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

      console.log('[AuthService] Auth data stored:', userData);
    }

    return data;
  };

  register = async (userData) => {
    console.log('[AuthService] Attempting registration with data:', userData);
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain, application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });

      const responseText = await response.text();
      console.log('[AuthService] Raw response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Registration failed');
      }

      return responseData;
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      throw error;
    }
  };

  verifyOtp = async (userData) => {
    try {
      // Format data to match PicklesLoginDTO with all user fields
      const verificationData = {
        firstname: userData.firstname,
        lastname: userData.lastname,
        emailid: userData.emailid,
        password: userData.password,
        mobilenum: userData.mobilenum,
        role: userData.role,
        otp: userData.otp
      };
      console.log('[AuthService] Attempting OTP verification with data:', verificationData);
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain, application/json'
        },
        credentials: 'include',
        body: JSON.stringify(verificationData)
      });

      const responseText = await response.text();
      console.log('[AuthService] Response text:', responseText);

      if (!response.ok) {
        let errorMessage = responseText;
        try {
          const jsonData = JSON.parse(responseText);
          errorMessage = jsonData.message || jsonData.error || 'OTP verification failed';
        } catch (e) {
          // Keep the text as is if it's not JSON
        }
        throw new Error(errorMessage);
      }

      try {
        return JSON.parse(responseText);
      } catch (e) {
        return { message: responseText };
      }
    } catch (error) {
      console.error('[AuthService] OTP verification error:', error);
      throw error;
    }
  };

  refreshToken = async () => {
    // Implementation here
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

      return { message: responseText };
    } catch (error) {
      console.error('[AuthService] Forgot password error:', error);
      throw error;
    }
  };

  validateResetOtp = async (email, otp) => {
    // Implementation here
  };

  resetPassword = async (email, newPassword) => {
    // Implementation here
  };

  logout = () => {
    console.log('[AuthService] Logging out');
    localStorage.removeItem(USER_DATA_KEY);
    cookieUtils.removeCookie(TOKEN_COOKIE);
    tokenService.clearTokens();
  };

  restoreSession = async () => {
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

      console.log('[AuthService] Session restored');
      return true;
    } catch (error) {
      console.error('[AuthService] Error restoring session:', error);
      this.logout();
      return false;
    }
  };
}

export const authService = new AuthService();