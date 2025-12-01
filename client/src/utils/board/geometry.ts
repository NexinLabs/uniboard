// Geometric calculation utilities

/**
 * Calculate the distance from a point to a line segment
 */
export function distanceToSegment(
    p: { x: number, y: number },
    a: { x: number, y: number },
    b: { x: number, y: number }
): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        const distX = p.x - a.x;
        const distY = p.y - a.y;
        return Math.sqrt(distX * distX + distY * distY);
    }

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = a.x + t * dx;
    const projY = a.y + t * dy;

    const distX = p.x - projX;
    const distY = p.y - projY;
    return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Calculate the distance from a point to a Bezier curve
 */
export function distanceToBezier(
    p: { x: number, y: number },
    p0: { x: number, y: number },
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    p3: { x: number, y: number }
): number {
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 0.01) {
        const mt = 1 - t;
        const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
        const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
        const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
        minDist = Math.min(minDist, dist);
    }
    return minDist;
}

/**
 * Get wrapped lines for text rendering
 */
export function getWrappedLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}
