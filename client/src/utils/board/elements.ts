// Element manipulation utilities

import type { Element, ResizeHandle, ResizeHandlePosition } from './types';
import { distanceToSegment, distanceToBezier } from './geometry';
import { getArrowPoints } from './arrows';

/**
 * Get resize handles for an element
 */
export function getResizeHandles(el: Element): ResizeHandlePosition[] {
    if (el.type === 'rect' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star') {
        const x = el.x;
        const y = el.y;
        const w = el.w || 0;
        const h = el.h || 0;
        return [
            { type: 'nw', x, y },
            { type: 'n', x: x + w / 2, y },
            { type: 'ne', x: x + w, y },
            { type: 'e', x: x + w, y: y + h / 2 },
            { type: 'se', x: x + w, y: y + h },
            { type: 's', x: x + w / 2, y: y + h },
            { type: 'sw', x, y: y + h },
            { type: 'w', x, y: y + h / 2 },
        ];
    } else if (el.type === 'circle') {
        const r = el.radius || 0;
        const x = el.x - r;
        const y = el.y - r;
        const w = r * 2;
        const h = r * 2;
        return [
            { type: 'nw', x, y },
            { type: 'ne', x: x + w, y },
            { type: 'se', x: x + w, y: y + h },
            { type: 'sw', x, y: y + h },
        ];
    }
    return [];
}

/**
 * Get cursor style for a resize handle
 */
export function getCursorForHandle(handle: ResizeHandle): string {
    switch (handle) {
        case 'nw': return 'nw-resize';
        case 'n': return 'n-resize';
        case 'ne': return 'ne-resize';
        case 'e': return 'e-resize';
        case 'se': return 'se-resize';
        case 's': return 's-resize';
        case 'sw': return 'sw-resize';
        case 'w': return 'w-resize';
        default: return 'default';
    }
}

/**
 * Find element at a given position
 */
export function getElementAtPosition(
    x: number,
    y: number,
    elements: Element[]
): Element | null {
    // Check in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.isHidden) continue;

        if (el.type === 'rect' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star') {
            const elX = el.x;
            const elY = el.y;
            const elW = el.w || 0;
            const elH = el.h || 0;
            if (x >= elX && x <= elX + elW && y >= elY && y <= elY + elH) {
                return el;
            }
        } else if (el.type === 'circle') {
            const dist = Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2);
            if (dist <= (el.radius || 0)) {
                return el;
            }
        } else if (el.type === 'text') {
            // Simple bounding box for text
            const textWidth = (el.text?.length || 0) * ((el.fontSize || 16) * 0.6);
            const textHeight = el.fontSize || 16;
            if (x >= el.x && x <= el.x + textWidth && y >= el.y - textHeight && y <= el.y) {
                return el;
            }
        } else if (el.type === 'arrow') {
            const points = getArrowPoints(el, elements);
            if (points.length === 0) continue;

            if (el.arrowType === 'curved' && points.length >= 2) {
                const fromPoint = points[0];
                const toPoint = points[points.length - 1];
                const dist = Math.sqrt(Math.pow(toPoint.x - fromPoint.x, 2) + Math.pow(toPoint.y - fromPoint.y, 2));
                const len = Math.max(dist * 0.5, 30);

                let cp1 = { x: fromPoint.x, y: fromPoint.y };
                let cp2 = { x: toPoint.x, y: toPoint.y };

                if (el.fromPoint?.position) {
                    switch (el.fromPoint.position) {
                        case 'top': cp1.y -= len; break;
                        case 'bottom': cp1.y += len; break;
                        case 'left': cp1.x -= len; break;
                        case 'right': cp1.x += len; break;
                    }
                } else {
                    cp1.x += (toPoint.x - fromPoint.x) / 2;
                }

                if (el.toPoint?.position) {
                    switch (el.toPoint.position) {
                        case 'top': cp2.y -= len; break;
                        case 'bottom': cp2.y += len; break;
                        case 'left': cp2.x -= len; break;
                        case 'right': cp2.x += len; break;
                    }
                } else {
                    cp2.x -= (toPoint.x - fromPoint.x) / 2;
                }

                const d = distanceToBezier({ x, y }, fromPoint, cp1, cp2, toPoint);
                if (d < 10) return el;
            } else {
                for (let j = 0; j < points.length - 1; j++) {
                    const d = distanceToSegment({ x, y }, points[j], points[j + 1]);
                    if (d < 10) return el;
                }
            }
        }
    }
    return null;
}

/**
 * Update multiple elements with partial updates
 */
export function updateElements(
    elements: Element[],
    selectedIds: string[],
    updates: Partial<Element>
): Element[] {
    return elements.map(el =>
        selectedIds.includes(el.id) ? { ...el, ...updates } : el
    );
}

/**
 * Delete elements by IDs
 */
export function deleteElements(elements: Element[], idsToDelete: string[]): Element[] {
    return elements.filter(el => !idsToDelete.includes(el.id));
}

/**
 * Duplicate elements with new IDs
 */
export function duplicateElements(elements: Element[], offset: { x: number, y: number } = { x: 20, y: 20 }): Element[] {
    return elements.map(el => ({
        ...el,
        id: `${Date.now()}-${Math.random()}`,
        x: el.x + offset.x,
        y: el.y + offset.y,
    }));
}

/**
 * Check if elements are within a selection box
 */
export function getElementsInSelectionBox(
    elements: Element[],
    selectionBox: { start: { x: number, y: number }, current: { x: number, y: number } }
): string[] {
    const minX = Math.min(selectionBox.start.x, selectionBox.current.x);
    const maxX = Math.max(selectionBox.start.x, selectionBox.current.x);
    const minY = Math.min(selectionBox.start.y, selectionBox.current.y);
    const maxY = Math.max(selectionBox.start.y, selectionBox.current.y);

    return elements
        .filter(el => {
            if (el.type === 'rect' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star') {
                const elX = el.x;
                const elY = el.y;
                const elW = el.w || 0;
                const elH = el.h || 0;
                return elX >= minX && elX + elW <= maxX && elY >= minY && elY + elH <= maxY;
            } else if (el.type === 'circle') {
                const r = el.radius || 0;
                return el.x - r >= minX && el.x + r <= maxX && el.y - r >= minY && el.y + r <= maxY;
            } else if (el.type === 'text') {
                return el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY;
            }
            return false;
        })
        .map(el => el.id);
}

/**
 * Change the shape of selected elements
 */
export function changeElementShape(elements: Element[], selectedIds: string[], newType: 'rect' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star'): Element[] {
    return elements.map(el => {
        if (selectedIds.includes(el.id)) {
            if (el.type === newType) return el;
            const updates: Partial<Element> = { type: newType };
            if (newType === 'circle' && (el.type === 'rect' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star')) {
                const size = Math.min(el.w || 50, el.h || 50);
                updates.radius = size / 2;
                updates.x = el.x + (el.w || 0) / 2;
                updates.y = el.y + (el.h || 0) / 2;
                updates.w = undefined;
                updates.h = undefined;
            } else if ((newType === 'rect' || newType === 'triangle' || newType === 'diamond' || newType === 'hexagon' || newType === 'star') && el.type === 'circle') {
                const r = el.radius || 25;
                updates.w = r * 2;
                updates.h = r * 2;
                updates.x = el.x - r;
                updates.y = el.y - r;
                updates.radius = undefined;
            } else if (el.type !== 'circle' && newType !== 'circle') {
                // Converting between rect-like shapes, just keep w/h
                updates.type = newType;
            }
            return { ...el, ...updates };
        }
        return el;
    });
}

/**
 * Toggle visibility of an element
 */
export function toggleElementVisibility(elements: Element[], id: string): Element[] {
    return elements.map(el =>
        el.id === id ? { ...el, isHidden: !el.isHidden } : el
    );
}
