import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext(null);

export function DarkModeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        return localStorage.getItem('labsys-dark') === 'true';
    });

    useEffect(() => {
        if (dark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('labsys-dark', dark);
    }, [dark]);

    const toggle = () => setDark(d => !d);

    return (
        <DarkModeContext.Provider value={{ dark, toggle }}>
            {children}
        </DarkModeContext.Provider>
    );
}

export function useDarkMode() {
    const ctx = useContext(DarkModeContext);
    if (!ctx) throw new Error('useDarkMode must be inside DarkModeProvider');
    return ctx;
}
