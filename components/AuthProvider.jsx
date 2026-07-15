'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { callFunction } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    const logout = useCallback(async () => {
        try { await callFunction('auth-logout', {}); } catch (_) {}
        localStorage.removeItem('fvn_session_token');
        localStorage.removeItem('fvn_user');
        setUser(null);
    }, []);

    const refresh = useCallback(async () => {
        const token = localStorage.getItem('fvn_session_token');
        if (!token) {
            setReady(true);
            return null;
        }
        try {
            const result = await callFunction('auth-me', null, { method: 'GET', token });
            localStorage.setItem('fvn_user', JSON.stringify(result.user));
            setUser(result.user);
            return result.user;
        } catch (_) {
            await logout();
            return null;
        } finally {
            setReady(true);
        }
    }, [logout]);

    useEffect(() => {
        const cached = localStorage.getItem('fvn_user');
        if (cached) {
            try { setUser(JSON.parse(cached)); } catch (_) {}
        }
        refresh();
    }, [refresh]);

    const login = useCallback(async (email, password) => {
        const result = await callFunction('auth-login', { email, password }, { token: null });
        localStorage.setItem('fvn_session_token', result.token);
        localStorage.setItem('fvn_user', JSON.stringify(result.user));
        setUser(result.user);
        return result.user;
    }, []);

    const updateUser = useCallback((next) => {
        setUser(next);
        localStorage.setItem('fvn_user', JSON.stringify(next));
    }, []);

    const value = useMemo(() => ({ user, ready, login, logout, refresh, updateUser }), [user, ready, login, logout, refresh, updateUser]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside AuthProvider');
    return value;
}
