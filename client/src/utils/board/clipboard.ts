// Clipboard operations (copy/cut/paste) utilities

import type { Element } from './types';

/**
 * Copy selected elements to clipboard
 */
export function copyElements(elements: Element[], selectedIds: string[]): Element[] {
    return elements.filter(el => selectedIds.includes(el.id));
}

/**
 * Cut selected elements (copy and mark for deletion)
 */
export function cutElements(
    elements: Element[],
    selectedIds: string[]
): { clipboard: Element[], remainingElements: Element[] } {
    const clipboard = elements.filter(el => selectedIds.includes(el.id));
    const remainingElements = elements.filter(el => !selectedIds.includes(el.id));
    return { clipboard, remainingElements };
}

/**
 * Paste elements from clipboard with offset
 */
export function pasteElements(
    clipboard: Element[],
    offset: { x: number, y: number } = { x: 20, y: 20 }
): Element[] {
    return clipboard.map(el => ({
        ...el,
        id: `${Date.now()}-${Math.random()}`,
        x: el.x + offset.x,
        y: el.y + offset.y,
        // Clear arrow connections when pasting
        fromId: undefined,
        toId: undefined,
        fromPoint: undefined,
        toPoint: undefined,
    }));
}
