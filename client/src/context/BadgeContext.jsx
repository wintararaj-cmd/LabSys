import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { reportAPI, inventoryAPI } from '../services/api';
import { useAuth } from './AuthContext';

/**
 * BadgeContext — provides live alert counts for sidebar badges.
 * Polls every 90 seconds while user is logged in.
 */
const BadgeContext = createContext(null);

export function BadgeProvider({ children }) {
    const { user } = useAuth();
    const [badges, setBadges] = useState({ pendingReports: 0, lowStock: 0 });

    const refresh = useCallback(async () => {
        if (!user) return;
        try {
            const [rRes, iRes] = await Promise.allSettled([
                reportAPI.getPending(),
                inventoryAPI.getAlerts(),
            ]);
            const pending = rRes.status === 'fulfilled'
                ? (rRes.value.data?.length ?? 0)
                : 0;
            const lowStock = iRes.status === 'fulfilled'
                ? (iRes.value.data?.alerts?.length ?? 0)
                : 0;
            setBadges({ pendingReports: pending, lowStock });
        } catch (_) { /* silently fail */ }
    }, [user]);

    // Initial load + subscribe to refresh events
    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 90_000);
        const onRefresh = () => refresh();
        window.addEventListener('labsys:badge-refresh', onRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('labsys:badge-refresh', onRefresh);
        };
    }, [refresh]);

    return (
        <BadgeContext.Provider value={{ badges, refresh }}>
            {children}
        </BadgeContext.Provider>
    );
}

export function useBadges() {
    const ctx = useContext(BadgeContext);
    if (!ctx) throw new Error('useBadges must be inside BadgeProvider');
    return ctx;
}
