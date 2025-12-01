// Arrow-specific utilities

import type { Element, ConnectionPoint, ArrowHandle } from './types';

/**
 * Get connection points for an element (for arrow attachment)
 */
export function getConnectionPoints(el: Element): ConnectionPoint[] {
    if (el.type === 'rect' || el.type === 'image') {
        const x = el.x;
        const y = el.y;
        const w = el.w || (el.type === 'image' ? 200 : 0);
        const h = el.h || (el.type === 'image' ? 200 : 0);
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        return [
            { x: centerX, y: y, position: 'top' },
            { x: x + w, y: centerY, position: 'right' },
            { x: centerX, y: y + h, position: 'bottom' },
            { x: x, y: centerY, position: 'left' },
        ];
    } else if (el.type === 'circle') {
        const r = el.radius || 0;
        return [
            { x: el.x, y: el.y - r, position: 'top' },
            { x: el.x + r, y: el.y, position: 'right' },
            { x: el.x, y: el.y + r, position: 'bottom' },
            { x: el.x - r, y: el.y, position: 'left' },
        ];
    }
    return [];
}

/**
 * Get arrow handles for manipulation (start, end, control points)
 */
export function getArrowHandles(el: Element, elements: Element[]): ArrowHandle[] {
    if (el.type !== 'arrow') return [];
    const handles: ArrowHandle[] = [];

    let fromPoint = el.startPoint;
    let toPoint = el.endPoint;

    if (el.fromId && el.fromPoint) {
        const fromEl = elements.find(e => e.id === el.fromId);
        if (fromEl) {
            const fromPoints = getConnectionPoints(fromEl);
            fromPoint = fromPoints.find(p => p.position === el.fromPoint?.position) || fromPoints[0];
        }
    }

    if (el.toId && el.toPoint) {
        const toEl = elements.find(e => e.id === el.toId);
        if (toEl) {
            const toPoints = getConnectionPoints(toEl);
            toPoint = toPoints.find(p => p.position === el.toPoint?.position) || toPoints[0];
        }
    }

    if (fromPoint) handles.push({ type: 'start', x: fromPoint.x, y: fromPoint.y });
    if (toPoint) handles.push({ type: 'end', x: toPoint.x, y: toPoint.y });

    if (el.arrowType === 'elbow' && fromPoint && toPoint) {
        const points = getArrowPoints(el, elements);
        if (points.length >= 3) {
            let midX = (fromPoint.x + toPoint.x) / 2;
            let midY = (fromPoint.y + toPoint.y) / 2;

            if (el.controlPoint) {
                midX = el.controlPoint.x;
                midY = el.controlPoint.y;
            }

            const isVerticalStart = el.fromPoint?.position === 'top' || el.fromPoint?.position === 'bottom';

            if (isVerticalStart) {
                handles.push({ type: 'control', x: (fromPoint.x + toPoint.x) / 2, y: midY });
            } else {
                handles.push({ type: 'control', x: midX, y: (fromPoint.y + toPoint.y) / 2 });
            }
        }
    }

    return handles;
}

/**
 * Get the points that make up an arrow path
 */
export function getArrowPoints(el: Element, elements: Element[]): { x: number, y: number }[] {
    let fromPoint = el.startPoint;
    let toPoint = el.endPoint;

    if (el.fromId && el.fromPoint) {
        const fromEl = elements.find(e => e.id === el.fromId);
        if (fromEl) {
            const fromPoints = getConnectionPoints(fromEl);
            fromPoint = fromPoints.find(p => p.position === el.fromPoint?.position) || fromPoints[0];
        }
    }

    if (el.toId && el.toPoint) {
        const toEl = elements.find(e => e.id === el.toId);
        if (toEl) {
            const toPoints = getConnectionPoints(toEl);
            toPoint = toPoints.find(p => p.position === el.toPoint?.position) || toPoints[0];
        }
    }

    if (!fromPoint || !toPoint) return [];

    const points: { x: number, y: number }[] = [{ x: fromPoint.x, y: fromPoint.y }];

    if (el.arrowType === 'elbow') {
        let midX = (fromPoint.x + toPoint.x) / 2;
        let midY = (fromPoint.y + toPoint.y) / 2;

        if (el.controlPoint) {
            midX = el.controlPoint.x;
            midY = el.controlPoint.y;
        }

        const isVerticalStart = el.fromPoint?.position === 'top' || el.fromPoint?.position === 'bottom';
        const isVerticalEnd = el.toPoint?.position === 'top' || el.toPoint?.position === 'bottom';

        if (el.toPoint?.position && !el.controlPoint && isVerticalStart !== isVerticalEnd) {
            if (isVerticalStart) {
                points.push({ x: fromPoint.x, y: toPoint.y });
            } else {
                points.push({ x: toPoint.x, y: fromPoint.y });
            }
        } else {
            if (isVerticalStart) {
                points.push({ x: fromPoint.x, y: midY });
                points.push({ x: toPoint.x, y: midY });
            } else {
                points.push({ x: midX, y: fromPoint.y });
                points.push({ x: midX, y: toPoint.y });
            }
        }
    }

    points.push({ x: toPoint.x, y: toPoint.y });
    return points;
}

/**
 * Find connection point at a given position
 */
export function getConnectionPointAtPosition(
    x: number,
    y: number,
    elements: Element[]
): { element: Element, point: ConnectionPoint } | null {
    for (const el of elements) {
        if (el.type === 'arrow' || el.type === 'text') continue;
        const points = getConnectionPoints(el);
        for (const point of points) {
            const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (dist < 10) {
                return { element: el, point };
            }
        }
    }
    return null;
}
