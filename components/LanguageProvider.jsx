'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext({
    language: 'en',
    setLanguage: () => {}
});

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState('en');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('lang');
        const fromStorage = window.localStorage.getItem('fvn-lang');
        setLanguageState(fromUrl === 'vi' || (!fromUrl && fromStorage === 'vi') ? 'vi' : 'en');
    }, []);

    useEffect(() => {
        document.documentElement.lang = language;
        window.localStorage.setItem('fvn-lang', language);
    }, [language]);

    function setLanguage(nextLanguage) {
        const normalized = nextLanguage === 'vi' ? 'vi' : 'en';
        setLanguageState(normalized);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (normalized === 'vi') url.searchParams.set('lang', 'vi');
            else url.searchParams.delete('lang');
            window.history.replaceState(null, '', url);
        }
    }

    const value = useMemo(() => ({ language, setLanguage }), [language]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    return useContext(LanguageContext);
}
