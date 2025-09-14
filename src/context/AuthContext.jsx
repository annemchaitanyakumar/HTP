import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { tokenService } from '@/services/tokenService';
import { cookieUtils } from '@/utils/cookieUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                setLoading(true);
                const restored = await authService.restoreSession();
                console.log('[AuthContext] Session restored:', restored);

                if (restored) {
                    const userData = tokenService.getUserInfo();
                    setUser(userData);
                    console.log('[AuthContext] User data:', userData);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        try {
            setLoading(true);
            const response = await authService.login(credentials);
            console.log('[AuthContext] Login successful:', response);
            
            const userData = tokenService.getUserInfo();
            setUser(userData);
            return true;
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            setUser(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await authService.logout();
            setUser(null);
            console.log('[AuthContext] Logout successful');
        } catch (error) {
            console.error('[AuthContext] Logout error:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
