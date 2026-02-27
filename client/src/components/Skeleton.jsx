import React from 'react';

/**
 * Skeleton — shimmer loading placeholder.
 * Usage:
 *   <Skeleton width="100%" height="1rem" />
 *   <Skeleton variant="circle" width={40} height={40} />
 *   <SkeletonTable rows={5} cols={6} />
 *   <SkeletonCard />
 */

export function Skeleton({ width = '100%', height = '1rem', variant = 'rect', style = {} }) {
    const base = {
        display: 'inline-block',
        background: 'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-150) 50%, var(--gray-100) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonShimmer 1.5s infinite',
        borderRadius: variant === 'circle' ? '50%' : '0.375rem',
        width,
        height,
        flexShrink: 0,
        ...style,
    };
    return <span style={base} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    width={i === lines - 1 ? lastWidth : '100%'}
                    height="0.875rem"
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ height = 120 }) {
    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
        }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Skeleton variant="circle" width={40} height={40} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <Skeleton width="40%" height="0.75rem" />
                    <Skeleton width="70%" height="1.25rem" />
                </div>
            </div>
            <Skeleton width="55%" height="0.75rem" />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: '2px solid var(--border)',
                background: 'var(--gray-50)',
            }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} height="0.75rem" width={`${50 + Math.random() * 40}%`} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, ri) => (
                <div
                    key={ri}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    {Array.from({ length: cols }).map((_, ci) => (
                        <Skeleton key={ci} height="0.875rem" width={`${40 + Math.random() * 50}%`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
