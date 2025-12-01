// History management (undo/redo) utilities

import type { Element } from './types';

export interface HistoryState {
    history: Element[][];
    historyIndex: number;
}

/**
 * Add a new state to history
 */
export function addToHistory(
    currentHistory: Element[][],
    currentIndex: number,
    newElements: Element[]
): HistoryState {
    const newHistory = currentHistory.slice(0, currentIndex + 1);
    newHistory.push(newElements);
    return {
        history: newHistory,
        historyIndex: newHistory.length - 1
    };
}

/**
 * Undo to previous state
 */
export function undo(
    history: Element[][],
    currentIndex: number
): { elements: Element[], newIndex: number } | null {
    if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        return {
            elements: history[newIndex],
            newIndex
        };
    }
    return null;
}

/**
 * Redo to next state
 */
export function redo(
    history: Element[][],
    currentIndex: number
): { elements: Element[], newIndex: number } | null {
    if (currentIndex < history.length - 1) {
        const newIndex = currentIndex + 1;
        return {
            elements: history[newIndex],
            newIndex
        };
    }
    return null;
}

/**
 * Check if undo is available
 */
export function canUndo(historyIndex: number): boolean {
    return historyIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: Element[][], historyIndex: number): boolean {
    return historyIndex < history.length - 1;
}
