/**
 * Virtual Scrolling Component
 * 
 * High-performance list rendering for large datasets
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualScrollProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
}

/**
 * Virtual scroll component for rendering large lists efficiently
 */
export function VirtualScroll<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
    className = ''
}: VirtualScrollProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate visible range
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div
                            key={startIndex + index}
                            style={{ height: itemHeight }}
                        >
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Hook for virtual scrolling state management
 */
export function useVirtualScroll<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    overscan: number = 5
) {
    const [scrollTop, setScrollTop] = useState(0);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
        startIndex,
        endIndex,
        visibleItems,
        totalHeight,
        offsetY,
        scrollTop,
        setScrollTop
    };
}

/**
 * Virtual Grid component for rendering large grids
 */
interface VirtualGridProps<T> {
    items: T[];
    itemWidth: number;
    itemHeight: number;
    containerWidth: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    gap?: number;
    className?: string;
}

export function VirtualGrid<T>({
    items,
    itemWidth,
    itemHeight,
    containerWidth,
    containerHeight,
    renderItem,
    gap = 0,
    className = ''
}: VirtualGridProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate columns
    const columns = Math.floor(containerWidth / (itemWidth + gap));
    const rows = Math.ceil(items.length / columns);
    const rowHeight = itemHeight + gap;

    // Calculate visible range
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const endRow = Math.min(rows - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + 1);

    const visibleItems: { item: T; index: number; row: number; col: number }[] = [];

    for (let row = startRow; row <= endRow; row++) {
        for (let col = 0; col < columns; col++) {
            const index = row * columns + col;
            if (index < items.length) {
                visibleItems.push({
                    item: items[index],
                    index,
                    row,
                    col
                });
            }
        }
    }

    const totalHeight = rows * rowHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, row, col }) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            top: row * rowHeight,
                            left: col * (itemWidth + gap),
                            width: itemWidth,
                            height: itemHeight
                        }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
