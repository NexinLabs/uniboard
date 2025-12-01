// Canvas drawing utilities

import type { Element, ConnectionPoint } from './types';
import { getWrappedLines } from './geometry';
import { getConnectionPoints, getArrowPoints } from './arrows';

/**
 * Draw a rounded rectangle path
 */
export function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Draw a triangle path
 */
export function drawTriangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
}

/**
 * Draw a diamond path
 */
export function drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.closePath();
}

/**
 * Draw a hexagon path
 */
export function drawHexagon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
): void {
    const sideX = w / 4;
    const sideY = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + sideX, y);
    ctx.lineTo(x + w - sideX, y);
    ctx.lineTo(x + w, y + sideY);
    ctx.lineTo(x + w - sideX, y + h);
    ctx.lineTo(x + sideX, y + h);
    ctx.lineTo(x, y + sideY);
    ctx.closePath();
}

/**
 * Draw a star path
 */
export function drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    points: number = 5
): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius / 2;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

/**
 * Draw a rounded path through multiple points
 */
export function drawRoundedPath(
    ctx: CanvasRenderingContext2D,
    points: { x: number, y: number }[],
    radius: number
): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist1 = Math.max(Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
        const dist2 = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
        const r = Math.min(radius, dist1 / 2, dist2 / 2);
        ctx.arcTo(p1.x, p1.y, p2.x, p2.y, r);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
}

/**
 * Draw connection points for an element
 */
export function drawConnectionPoints(
    ctx: CanvasRenderingContext2D,
    el: Element,
    hoveredConnectionPoint: { elementId: string, point: ConnectionPoint } | null
): void {
    const points = getConnectionPoints(el);
    points.forEach(point => {
        const isHovered = hoveredConnectionPoint?.elementId === el.id &&
            hoveredConnectionPoint?.point.position === point.position;
        ctx.fillStyle = isHovered ? '#3b82f6' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isHovered ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

/**
 * Draw text with wrapping support
 */
export function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    fontSize: number,
    textAlign: 'left' | 'center' | 'right',
    wrap: boolean
): void {
    ctx.textAlign = textAlign;
    if (wrap) {
        const lines = getWrappedLines(ctx, text, maxWidth);
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        let startY = y - totalHeight / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, x, startY + i * lineHeight);
        });
    } else {
        ctx.fillText(text, x, y);
    }
}

/**
 * Draw an arrow head
 */
export function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    headLength: number = 15
): void {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - headLength * Math.cos(angle - Math.PI / 6),
        y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - headLength * Math.cos(angle + Math.PI / 6),
        y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
}

/**
 * Draw an arrow element
 */
export function drawArrow(
    ctx: CanvasRenderingContext2D,
    el: Element,
    elements: Element[],
    isSelected: boolean
): void {
    const fromEl = elements.find(e => e.id === el.fromId);
    const toEl = elements.find(e => e.id === el.toId);

    let fromPoint = el.startPoint;
    let toPoint = el.endPoint;

    if (fromEl && el.fromPoint) {
        const fromPoints = getConnectionPoints(fromEl);
        fromPoint = fromPoints.find(p => p.position === el.fromPoint?.position) || fromPoints[0];
    }

    if (toEl && el.toPoint) {
        const toPoints = getConnectionPoints(toEl);
        toPoint = toPoints.find(p => p.position === el.toPoint?.position) || toPoints[0];
    }

    if (!fromPoint || !toPoint) return;

    ctx.strokeStyle = el.color || 'white';
    ctx.lineWidth = (el.lineWidth || 2) + (isSelected ? 1 : 0);

    // Set line style
    if (el.lineStyle === 'dashed') ctx.setLineDash([10, 5]);
    else if (el.lineStyle === 'dotted') ctx.setLineDash([2, 4]);
    else ctx.setLineDash([]);

    let endAngle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);

    // Draw arrow path based on type
    if (el.arrowType === 'elbow') {
        const points = getArrowPoints(el, elements);
        drawRoundedPath(ctx, points, 12);

        if (points.length >= 2) {
            const pLast = points[points.length - 1];
            const pPrev = points[points.length - 2];
            endAngle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
        }
    } else if (el.arrowType === 'curved') {
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

        ctx.beginPath();
        ctx.moveTo(fromPoint.x, fromPoint.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, toPoint.x, toPoint.y);
        ctx.stroke();
        endAngle = Math.atan2(toPoint.y - cp2.y, toPoint.x - cp2.x);
    } else {
        // Straight arrow
        ctx.beginPath();
        ctx.moveTo(fromPoint.x, fromPoint.y);
        ctx.lineTo(toPoint.x, toPoint.y);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // Adjust end angle based on connection point
    if (el.toPoint?.position) {
        switch (el.toPoint.position) {
            case 'top': endAngle = Math.PI / 2; break;
            case 'bottom': endAngle = -Math.PI / 2; break;
            case 'left': endAngle = 0; break;
            case 'right': endAngle = Math.PI; break;
        }
    }

    // Draw arrow heads
    const headLength = 15;

    // Start arrow head
    if (el.arrowHead === 'start' || el.arrowHead === 'both') {
        let startAngle;
        if (el.fromPoint?.position) {
            switch (el.fromPoint.position) {
                case 'top': startAngle = Math.PI / 2; break;
                case 'bottom': startAngle = -Math.PI / 2; break;
                case 'left': startAngle = 0; break;
                case 'right': startAngle = Math.PI; break;
            }
        } else if (el.arrowType === 'elbow') {
            const points = getArrowPoints(el, elements);
            if (points.length >= 2) {
                const p0 = points[0];
                const p1 = points[1];
                startAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI;
            } else {
                startAngle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x) + Math.PI;
            }
        } else if (el.arrowType === 'curved') {
            const dx = toPoint.x - fromPoint.x;
            const controlPoint1 = { x: fromPoint.x + dx / 2, y: fromPoint.y };
            startAngle = Math.atan2(controlPoint1.y - fromPoint.y, controlPoint1.x - fromPoint.x) + Math.PI;
        } else {
            startAngle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x) + Math.PI;
        }

        drawArrowHead(ctx, fromPoint.x, fromPoint.y, startAngle, headLength);
    }

    // End arrow head
    if (el.arrowHead === 'end' || el.arrowHead === 'both' || !el.arrowHead) {
        drawArrowHead(ctx, toPoint.x, toPoint.y, endAngle, headLength);
    }
}
