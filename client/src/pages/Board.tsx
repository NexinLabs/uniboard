import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { appConfig } from '../config';
import api from '../utils/api';
import {
    Square, Circle, Type, Trash2, MousePointer,
    ArrowRight, Hand,
    Minus, CornerDownRight, Activity, ArrowLeft, ArrowLeftRight,
    Plus, Search, AlignLeft, AlignCenter, AlignRight,
    Layers, Eye, EyeOff, Copy, Scissors, Clipboard, MoreHorizontal,
    BringToFront, Download
} from 'lucide-react';

type Tool = 'select' | 'rect' | 'circle' | 'text' | 'image' | 'arrow' | 'line' | 'draw' | 'frame' | 'pan';

interface ConnectionPoint {
    x: number;
    y: number;
    position: 'top' | 'right' | 'bottom' | 'left';
}

interface Element {
    id: string;
    type: 'rect' | 'circle' | 'text' | 'image' | 'arrow';
    x: number;
    y: number;
    w?: number;
    h?: number;
    radius?: number;
    text?: string;
    imageUrl?: string;
    color?: string;
    fromId?: string;
    toId?: string;
    fromPoint?: ConnectionPoint;
    toPoint?: ConnectionPoint;
    startPoint?: { x: number, y: number };
    endPoint?: { x: number, y: number };
    // New properties
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'center' | 'left' | 'right';
    arrowType?: 'straight' | 'elbow' | 'curved';
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    lineWidth?: number;
    arrowHead?: 'none' | 'start' | 'end' | 'both';
    backgroundColor?: string;
    opacity?: number;
    strokeWidth?: number;
    textColor?: string;
    textWrap?: boolean;
    controlPoint?: { x: number, y: number };
    isHidden?: boolean;
    isLocked?: boolean;
}

const distanceToSegment = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
    const A = p.x - a.x;
    const B = p.y - a.y;
    const C = b.x - a.x;
    const D = b.y - a.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = a.x;
        yy = a.y;
    } else if (param > 1) {
        xx = b.x;
        yy = b.y;
    } else {
        xx = a.x + param * C;
        yy = a.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};

const distanceToBezier = (p: { x: number, y: number }, p0: { x: number, y: number }, p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }) => {
    let minDst = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
        const x = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * t * t * p2.x + t * t * t * p3.x;
        const y = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * t * t * p2.y + t * t * t * p3.y;
        const d = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        if (d < minDst) minDst = d;
    }
    return minDst;
};

const getWrappedLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
};

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const Board = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const [tool, setTool] = useState<Tool>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [elements, setElements] = useState<Element[]>([]);
    const [history, setHistory] = useState<Element[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState<Element[]>([]);
    const [currentColor, setCurrentColor] = useState('#ffffff');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

    const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
    const [arrowStart, setArrowStart] = useState<{ x: number, y: number, elementId?: string, point?: ConnectionPoint } | null>(null);
    const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{ elementId: string, point: ConnectionPoint } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, current: { x: number, y: number } } | null>(null);

    // New state for advanced features
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
    const [arrowHandle, setArrowHandle] = useState<{ type: 'start' | 'end' | 'control', x: number, y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId: string } | null>(null);
    const [showLayers, setShowLayers] = useState(false);
    const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);

    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const zoom = 1;

    const getArrowHandles = (el: Element): { type: 'start' | 'end' | 'control', x: number, y: number }[] => {
        if (el.type !== 'arrow') return [];
        const handles: { type: 'start' | 'end' | 'control', x: number, y: number }[] = [];

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
            const points = getArrowPoints(el);
            // We want the handle on the "middle" segment.
            // getArrowPoints returns [Start, P1, P2, End] for Z-shape.
            // Middle segment is P1 -> P2.
            if (points.length >= 3) {
                // If 4 points: S -> P1 -> P2 -> E. Middle is P1-P2.
                // If 3 points (aligned): S -> P1 -> E. Middle is P1-E? No, usually 4 points for elbow unless aligned.

                // Let's stick to the previous logic for handle placement as it was robust enough
                // But we can use the points to be sure.

                // Actually, the previous logic was:
                // if vertical start: handle at (midX, midY) where midX is variable, midY is fixed?
                // No, if vertical start: S -> (S.x, midY) -> (E.x, midY) -> E.
                // The middle segment is horizontal: y = midY.
                // We want to drag it vertically? No, we drag the horizontal segment up/down.
                // So handle should be at ((S.x + E.x)/2, midY).

                let midX = (fromPoint.x + toPoint.x) / 2;
                let midY = (fromPoint.y + toPoint.y) / 2;

                if (el.controlPoint) {
                    midX = el.controlPoint.x;
                    midY = el.controlPoint.y;
                }

                const isVerticalStart = el.fromPoint?.position === 'top' || el.fromPoint?.position === 'bottom';

                if (isVerticalStart) {
                    // Middle segment is horizontal at y=midY. We drag it up/down.
                    // Handle should be at center of that segment.
                    // Segment is from (fromPoint.x, midY) to (toPoint.x, midY).
                    handles.push({ type: 'control', x: (fromPoint.x + toPoint.x) / 2, y: midY });
                } else {
                    // Middle segment is vertical at x=midX. We drag it left/right.
                    handles.push({ type: 'control', x: midX, y: (fromPoint.y + toPoint.y) / 2 });
                }
            }
        }

        return handles;
    };

    const getResizeHandles = (el: Element): { type: ResizeHandle, x: number, y: number }[] => {
        if (el.type === 'rect' || el.type === 'image') {
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
    };

    const getCursorForHandle = (handle: ResizeHandle) => {
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
    };



    useEffect(() => {
        const fetchBoard = async () => {
            if (!user) return;
            try {
                const res = await api.get(`/api/boards/${id}`);
                const loadedElements = res.data.elements || [];
                setElements(loadedElements);
                setHistory([loadedElements]);
                setHistoryIndex(0);
            } catch (err) {
                console.log(err);
            }
        };
        fetchBoard();

        // Setup Socket.IO connection
        if (!socketRef.current && id) {
            console.log('Connecting to Socket.IO...');
            socketRef.current = io(appConfig.API_URL);

            // Join the board room
            socketRef.current.emit('join-board', id);
            console.log('Joined board room:', id);

            // Listen for updates from other users
            socketRef.current.on('elements-updated', (updatedElements: Element[]) => {
                console.log('📡 Received elements update from another user');
                setElements(updatedElements);
                addToHistory(updatedElements);
            });

            socketRef.current.on('user-joined', (data: any) => {
                console.log('👋 User joined:', data.userId);
            });

            socketRef.current.on('user-left', (data: any) => {
                console.log('👋 User left:', data.userId);
            });
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (socketRef.current) {
                console.log('Disconnecting from Socket.IO...');
                socketRef.current.emit('leave-board', id);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [id, user]);

    // REMOVED: No longer needed - server handles DB saves via Socket.IO
    // const saveElements = async (elementsToSave: Element[]) => { ... }

    // Emit changes via Socket.IO ONLY - server handles DB save
    const emitElements = (elementsToSave: Element[]) => {
        if (socketRef.current && id) {
            console.log('📤 Emitting elements via Socket.IO (server will save to DB)');
            socketRef.current.emit('element-update', {
                boardId: id,
                elements: elementsToSave
            });
        } else {
            console.warn('⚠️ Socket not connected, changes not synced!');
        }
    };

    const addToHistory = (newElements: Element[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            emitElements(history[newIndex]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            emitElements(history[newIndex]);
        }
    };

    const getConnectionPoints = (el: Element): ConnectionPoint[] => {
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
    };

    const getArrowPoints = (el: Element): { x: number, y: number }[] => {
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
    };

    const drawRoundedPath = (ctx: CanvasRenderingContext2D, points: { x: number, y: number }[], radius: number) => {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 1; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            // Limit radius to half the length of the shortest adjacent segment to avoid artifacts
            // We check both X and Y distances, one will be 0 for orthogonal lines, so we take the max of the diffs
            const dist1 = Math.max(Math.abs(p1.x - p0.x), Math.abs(p1.y - p0.y));
            const dist2 = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            const r = Math.min(radius, dist1 / 2, dist2 / 2);
            ctx.arcTo(p1.x, p1.y, p2.x, p2.y, r);
        }

        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoom, zoom);

        elements.forEach(el => {
            if (el.isHidden) return;
            const isSelected = selectedElements.includes(el.id);

            if (el.type === 'arrow') {
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
                ctx.lineWidth = (el.lineWidth || 2) + (selectedElements.includes(el.id) ? 1 : 0);

                if (el.lineStyle === 'dashed') ctx.setLineDash([10, 5]);
                else if (el.lineStyle === 'dotted') ctx.setLineDash([2, 4]);
                else ctx.setLineDash([]);

                let endAngle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);

                if (el.arrowType === 'elbow') {
                    const points = getArrowPoints(el);
                    drawRoundedPath(ctx, points, 12); // Radius 12

                    // Calculate end angle from last segment
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
                    // Approximate end angle for bezier
                    endAngle = Math.atan2(toPoint.y - cp2.y, toPoint.x - cp2.x);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(fromPoint.x, fromPoint.y);
                    ctx.lineTo(toPoint.x, toPoint.y);
                    ctx.stroke();
                }
                // ctx.stroke(); // Removed because drawRoundedPath strokes, and others stroke manually
                ctx.setLineDash([]);
                const headLength = 15;

                if (el.toPoint?.position) {
                    switch (el.toPoint.position) {
                        case 'top': endAngle = Math.PI / 2; break;
                        case 'bottom': endAngle = -Math.PI / 2; break;
                        case 'left': endAngle = 0; break;
                        case 'right': endAngle = Math.PI; break;
                    }
                }

                // Draw start arrow head
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
                        const points = getArrowPoints(el);
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

                    ctx.beginPath();
                    ctx.moveTo(fromPoint.x, fromPoint.y);
                    ctx.lineTo(
                        fromPoint.x - headLength * Math.cos(startAngle - Math.PI / 6),
                        fromPoint.y - headLength * Math.sin(startAngle - Math.PI / 6)
                    );
                    ctx.moveTo(fromPoint.x, fromPoint.y);
                    ctx.lineTo(
                        fromPoint.x - headLength * Math.cos(startAngle + Math.PI / 6),
                        fromPoint.y - headLength * Math.sin(startAngle + Math.PI / 6)
                    );
                    ctx.stroke();
                }

                // Draw end arrow head
                if (el.arrowHead === 'end' || el.arrowHead === 'both' || !el.arrowHead) {
                    ctx.beginPath();
                    ctx.moveTo(toPoint.x, toPoint.y);
                    ctx.lineTo(
                        toPoint.x - headLength * Math.cos(endAngle - Math.PI / 6),
                        toPoint.y - headLength * Math.sin(endAngle - Math.PI / 6)
                    );
                    ctx.moveTo(toPoint.x, toPoint.y);
                    ctx.lineTo(
                        toPoint.x - headLength * Math.cos(endAngle + Math.PI / 6),
                        toPoint.y - headLength * Math.sin(endAngle + Math.PI / 6)
                    );
                    ctx.stroke();
                }
            } else if (el.type === 'rect') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    const radius = 8;
                    const x = el.x;
                    const y = el.y;
                    const w = el.w || 0;
                    const h = el.h || 0;
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
                    ctx.fill();
                }

                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                const radius = 8;
                const x = el.x;
                const y = el.y;
                const w = el.w || 0;
                const h = el.h || 0;
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
                ctx.stroke();

                // Reset alpha for text
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = x + w / 2;
                    if (el.textAlign === 'left') textX = x + 10;
                    if (el.textAlign === 'right') textX = x + w - 10;

                    if (el.textWrap) {
                        const maxWidth = w - 20;
                        const lines = getWrappedLines(ctx, el.text, maxWidth);
                        const lineHeight = fontSize * 1.2;
                        const totalHeight = lines.length * lineHeight;
                        let startY = y + h / 2 - totalHeight / 2 + lineHeight / 2;

                        lines.forEach((line, i) => {
                            ctx.fillText(line, textX, startY + i * lineHeight);
                        });
                    } else {
                        ctx.fillText(el.text, textX, y + h / 2);
                    }
                }

                if (tool === 'arrow' || isSelected) {
                    getConnectionPoints(el).forEach(point => {
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
            } else if (el.type === 'circle') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    ctx.beginPath();
                    ctx.arc(el.x, el.y, el.radius || 0, 0, 2 * Math.PI);
                    ctx.fill();
                }

                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                ctx.beginPath();
                ctx.arc(el.x, el.y, el.radius || 0, 0, 2 * Math.PI);
                ctx.stroke();

                // Reset alpha for text
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x;
                    if (el.textAlign === 'left') textX = el.x - (el.radius || 0) + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.radius || 0) - 10;

                    if (el.textWrap) {
                        const maxWidth = (el.radius || 0) * 2 - 20;
                        const lines = getWrappedLines(ctx, el.text, maxWidth);
                        const lineHeight = fontSize * 1.2;
                        const totalHeight = lines.length * lineHeight;
                        let startY = el.y - totalHeight / 2 + lineHeight / 2;

                        lines.forEach((line, i) => {
                            ctx.fillText(line, textX, startY + i * lineHeight);
                        });
                    } else {
                        ctx.fillText(el.text, textX, el.y);
                    }
                }

                if (tool === 'arrow' || isSelected) {
                    getConnectionPoints(el).forEach(point => {
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
            } else if (el.type === 'text') {
                ctx.globalAlpha = el.opacity || 1;
                ctx.fillStyle = el.textColor || el.color || 'white';
                ctx.font = `${el.fontSize || 16}px ${el.fontFamily || 'Arial'}`;
                ctx.textAlign = el.textAlign || 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(el.text || '', el.x, el.y);
                if (isSelected) {
                    ctx.strokeStyle = '#60a5fa';
                    const textWidth = ctx.measureText(el.text || '').width;
                    ctx.strokeRect(el.x - 2, el.y - 18, textWidth + 4, 20);
                }
            } else if (el.type === 'image' && el.imageUrl) {
                ctx.globalAlpha = el.opacity || 1;
                const img = new Image();
                img.src = el.imageUrl;
                if (img.complete) {
                    ctx.drawImage(img, el.x, el.y, el.w || 200, el.h || 200);
                    if (isSelected) {
                        ctx.strokeStyle = '#60a5fa';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(el.x, el.y, el.w || 200, el.h || 200);
                    }
                }

                if (tool === 'arrow' || isSelected) {
                    getConnectionPoints(el).forEach(point => {
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
            }

            ctx.globalAlpha = 1;

            if (isSelected && (el.type === 'rect' || el.type === 'circle' || el.type === 'image')) {
                const handles = getResizeHandles(el);
                handles.forEach(handle => {
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        });

        if (selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el && el.type === 'arrow') {
                const handles = getArrowHandles(el);
                handles.forEach(handle => {
                    ctx.fillStyle = handle.type === 'control' ? '#f59e0b' : 'white';
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    if (handle.type === 'control') {
                        ctx.arc(handle.x, handle.y, 5, 0, 2 * Math.PI);
                    } else {
                        ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
                    }
                    ctx.fill();
                    ctx.stroke();
                });
            }
        }

        if ((tool === 'arrow' || tool === 'line') && arrowStart && currentPos) {
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(arrowStart.x, arrowStart.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (selectionBox) {
            ctx.strokeStyle = '#3b82f6';
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.lineWidth = 1;
            const x = Math.min(selectionBox.start.x, selectionBox.current.x);
            const y = Math.min(selectionBox.start.y, selectionBox.current.y);
            const w = Math.abs(selectionBox.current.x - selectionBox.start.x);
            const h = Math.abs(selectionBox.current.y - selectionBox.start.y);
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }

        if (isDrawing && startPos && currentPos && tool !== 'select' && tool !== 'pan' && tool !== 'arrow' && tool !== 'line') {
            ctx.strokeStyle = currentColor;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;

            if (tool === 'rect') {
                const w = currentPos.x - startPos.x;
                const h = currentPos.y - startPos.y;
                const radius = 8;
                const x = startPos.x;
                const y = startPos.y;
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
                ctx.stroke();
            } else if (tool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(currentPos.x - startPos.x, 2) +
                    Math.pow(currentPos.y - startPos.y, 2)
                );
                ctx.beginPath();
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }, [elements, isDrawing, startPos, currentPos, tool, selectedElements, panOffset, zoom, arrowStart, hoveredConnectionPoint, editingElementId]);

    const getCanvasCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - panOffset.x) / zoom,
            y: (e.clientY - rect.top - panOffset.y) / zoom
        };
    };

    const getElementAtPosition = (x: number, y: number): Element | null => {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            if (el.isHidden) continue;

            if (el.type === 'rect') {
                if (x >= el.x && x <= el.x + (el.w || 0) &&
                    y >= el.y && y <= el.y + (el.h || 0)) {
                    return el;
                }
            } else if (el.type === 'circle') {
                const dist = Math.sqrt(Math.pow(x - el.x, 2) + Math.pow(y - el.y, 2));
                if (dist <= (el.radius || 0)) {
                    return el;
                }
            } else if (el.type === 'text') {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.font = `${el.fontSize || 16}px ${el.fontFamily || 'Arial'}`;
                    const textWidth = ctx.measureText(el.text || '').width;
                    const height = el.fontSize || 16;
                    if (x >= el.x && x <= el.x + textWidth && y >= el.y - height && y <= el.y + height / 2) {
                        return el;
                    }
                }
            } else if (el.type === 'image') {
                if (x >= el.x && x <= el.x + (el.w || 200) && y >= el.y && y <= el.y + (el.h || 200)) {
                    return el;
                }
            } else if (el.type === 'arrow') {
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

                if (fromPoint && toPoint) {
                    if (el.arrowType === 'elbow') {
                        const points = getArrowPoints(el);
                        let hit = false;
                        for (let j = 0; j < points.length - 1; j++) {
                            if (distanceToSegment({ x, y }, points[j], points[j + 1]) < 10) {
                                hit = true;
                                break;
                            }
                        }
                        if (hit) return el;
                    } else if (el.arrowType === 'curved') {
                        const dx = toPoint.x - fromPoint.x;
                        const controlPoint1 = { x: fromPoint.x + dx / 2, y: fromPoint.y };
                        const controlPoint2 = { x: toPoint.x - dx / 2, y: toPoint.y };
                        if (distanceToBezier({ x, y }, fromPoint, controlPoint1, controlPoint2, toPoint) < 10) {
                            return el;
                        }
                    } else {
                        if (distanceToSegment({ x, y }, fromPoint, toPoint) < 10) return el;
                    }
                }
            }
        }
        return null;
    };

    const getConnectionPointAtPosition = (x: number, y: number): { element: Element, point: ConnectionPoint } | null => {
        for (const el of elements) {
            if (el.type === 'arrow' || el.isHidden) continue;
            const points = getConnectionPoints(el);
            for (const point of points) {
                const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                if (dist <= 10) {
                    return { element: el, point };
                }
            }
        }
        return null;
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const { x, y } = getCanvasCoords(e);
        const element = getElementAtPosition(x, y);
        if (element && (element.type === 'rect' || element.type === 'circle')) {
            setEditingElementId(element.id);
            setTool('select');
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);
        const element = getElementAtPosition(x, y);
        if (element) {
            setContextMenu({ x: e.clientX, y: e.clientY, elementId: element.id });
            if (!selectedElements.includes(element.id)) {
                setSelectedElements([element.id]);
            }
        } else {
            setContextMenu(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = getCanvasCoords(e);

        if (isDrawing && arrowHandle && selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el && el.type === 'arrow') {
                const newElements = elements.map(e => {
                    if (e.id === el.id) {
                        if (arrowHandle.type === 'control') {
                            return { ...e, controlPoint: { x, y } };
                        } else if (arrowHandle.type === 'start') {
                            const connection = getConnectionPointAtPosition(x, y);
                            if (connection) {
                                return { ...e, startPoint: undefined, fromId: connection.element.id, fromPoint: connection.point };
                            } else {
                                return { ...e, startPoint: { x, y }, fromId: undefined, fromPoint: undefined };
                            }
                        } else if (arrowHandle.type === 'end') {
                            const connection = getConnectionPointAtPosition(x, y);
                            if (connection) {
                                return { ...e, endPoint: undefined, toId: connection.element.id, toPoint: connection.point };
                            } else {
                                return { ...e, endPoint: { x, y }, toId: undefined, toPoint: undefined };
                            }
                        }
                    }
                    return e;
                });
                setElements(newElements);
                return;
            }
        }

        if (isDrawing && resizeHandle && selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el) {
                let newX = el.x;
                let newY = el.y;
                let newW = el.w || 0;
                let newH = el.h || 0;
                let newRadius = el.radius || 0;

                if (el.type === 'rect' || el.type === 'image') {
                    if (resizeHandle.includes('e')) newW = x - el.x;
                    if (resizeHandle.includes('s')) newH = y - el.y;
                    if (resizeHandle.includes('w')) {
                        const right = el.x + (el.w || 0);
                        newX = x;
                        newW = right - x;
                    }
                    if (resizeHandle.includes('n')) {
                        const bottom = el.y + (el.h || 0);
                        newY = y;
                        newH = bottom - y;
                    }

                    if (newW < 10) newW = 10;
                    if (newH < 10) newH = 10;
                } else if (el.type === 'circle') {
                    const centerX = el.x;
                    const centerY = el.y;
                    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    newRadius = dist;
                    if (newRadius < 5) newRadius = 5;
                }

                const newElements = elements.map(e => {
                    if (e.id === el.id) {
                        return { ...e, x: newX, y: newY, w: newW, h: newH, radius: newRadius };
                    }
                    return e;
                });
                setElements(newElements);
                return;
            }
        }

        if (!isDrawing && selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el) {
                const handles = getResizeHandles(el);
                const hoveredHandle = handles.find(h => {
                    return x >= h.x - 5 && x <= h.x + 5 && y >= h.y - 5 && y <= h.y + 5;
                });
                if (hoveredHandle && canvasRef.current) {
                    canvasRef.current.style.cursor = getCursorForHandle(hoveredHandle.type);
                } else if (canvasRef.current && tool === 'select') {
                    canvasRef.current.style.cursor = 'default';
                }
            }
        }

        if (tool === 'arrow' || tool === 'line') {
            const connection = getConnectionPointAtPosition(x, y);
            if (connection) {
                setHoveredConnectionPoint({ elementId: connection.element.id, point: connection.point });
            } else {
                setHoveredConnectionPoint(null);
            }
        }

        if (isPanning && startPos) {
            setPanOffset({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
            return;
        }

        if (!isDrawing) {
            if ((tool === 'arrow' || tool === 'line') && arrowStart) {
                setCurrentPos({ x, y });
            }
            return;
        }

        if (selectionBox) {
            setSelectionBox({ ...selectionBox, current: { x, y } });
            return;
        }

        if (tool === 'select' && selectedElements.length > 0 && dragOffset) {
            const firstSelected = elements.find(el => el.id === selectedElements[0]);
            if (!firstSelected) return;

            const dx = x - firstSelected.x - dragOffset.x;
            const dy = y - firstSelected.y - dragOffset.y;

            const newElements = elements.map(el => {
                if (selectedElements.includes(el.id)) {
                    return { ...el, x: el.x + dx, y: el.y + dy };
                }
                return el;
            });
            setElements(newElements);

            const newFirstSelected = newElements.find(el => el.id === selectedElements[0])!;
            setDragOffset({ x: x - newFirstSelected.x, y: y - newFirstSelected.y });
        } else {
            setCurrentPos({ x, y });
        }
    };

    const startDrawing = (e: React.MouseEvent) => {
        if (contextMenu) {
            setContextMenu(null);
            return;
        }

        const { x, y } = getCanvasCoords(e);

        if (selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el) {
                if (el.type === 'rect' || el.type === 'circle' || el.type === 'image') {
                    const handles = getResizeHandles(el);
                    const clickedHandle = handles.find(h => {
                        return x >= h.x - 5 && x <= h.x + 5 && y >= h.y - 5 && y <= h.y + 5;
                    });
                    if (clickedHandle) {
                        setResizeHandle(clickedHandle.type);
                        setIsDrawing(true);
                        setStartPos({ x, y });
                        return;
                    }
                } else if (el.type === 'arrow') {
                    const handles = getArrowHandles(el);
                    const clickedHandle = handles.find(h => {
                        return x >= h.x - 5 && x <= h.x + 5 && y >= h.y - 5 && y <= h.y + 5;
                    });
                    if (clickedHandle) {
                        setArrowHandle(clickedHandle);
                        setIsDrawing(true);
                        setStartPos({ x, y });
                        return;
                    }
                }
            }
        }

        if (tool === 'pan' || e.button === 1) {
            setIsPanning(true);
            setStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            return;
        }

        if (tool === 'arrow' || tool === 'line') {
            const connection = getConnectionPointAtPosition(x, y);
            const start = connection ? { x: connection.point.x, y: connection.point.y } : { x, y };
            const startId = connection ? connection.element.id : undefined;
            const startPoint = connection ? connection.point : undefined;

            if (!arrowStart) {
                setArrowStart({ x: start.x, y: start.y, elementId: startId, point: startPoint });
                setCurrentPos({ x, y });
                // setTool(tool); // Already set
            } else {
                // Finish arrow
                const end = connection ? { x: connection.point.x, y: connection.point.y } : { x, y };
                const endId = connection ? connection.element.id : undefined;
                const endPoint = connection ? connection.point : undefined;

                const newElement: Element = {
                    id: Date.now().toString(),
                    type: 'arrow',
                    x: 0,
                    y: 0,
                    fromId: arrowStart.elementId,
                    toId: endId,
                    fromPoint: arrowStart.point,
                    toPoint: endPoint,
                    startPoint: !arrowStart.elementId ? { x: arrowStart.x, y: arrowStart.y } : undefined,
                    endPoint: !endId ? { x: end.x, y: end.y } : undefined,
                    color: currentColor,
                    arrowHead: tool === 'line' ? 'none' : 'end',
                    arrowType: tool === 'line' ? 'straight' : 'straight'
                };
                const newElements = [...elements, newElement];
                setElements(newElements);
                addToHistory(newElements);
                emitElements(newElements);
                setArrowStart(null);
                setCurrentPos(null);
                setTool('select');
            }
            return;
        }

        if (tool === 'select') {
            const connection = getConnectionPointAtPosition(x, y);
            if (connection) {
                setArrowStart({ x: connection.point.x, y: connection.point.y, elementId: connection.element.id, point: connection.point });
                setCurrentPos({ x, y });
                setTool('arrow');
                return;
            }

            const element = getElementAtPosition(x, y);
            if (element) {
                if (e.shiftKey) {
                    setSelectedElements(prev => [...prev, element.id]);
                } else if (!selectedElements.includes(element.id)) {
                    setSelectedElements([element.id]);
                }
                setDragOffset({ x: x - element.x, y: y - element.y });
                setIsDrawing(true);
                setShowPropertiesPanel(true);
            } else {
                // Start marquee selection
                setSelectionBox({ start: { x, y }, current: { x, y } });
                setSelectedElements([]);
                setShowPropertiesPanel(false);
            }
        } else if (tool === 'text') {
            const text = prompt("Enter text:");
            if (text) {
                const newElement: Element = {
                    id: Date.now().toString(),
                    type: 'text',
                    x,
                    y,
                    text,
                    color: currentColor
                };
                const newElements = [...elements, newElement];
                setElements(newElements);
                addToHistory(newElements);
                emitElements(newElements);
                setTool('select');
            }
        } else {
            setIsDrawing(true);
            setStartPos({ x, y });
            setCurrentPos({ x, y });
        }
    };

    const stopDrawing = async () => {
        if (resizeHandle || arrowHandle) {
            setResizeHandle(null);
            setArrowHandle(null);
            setIsDrawing(false);
            addToHistory(elements);
            emitElements(elements);
            return;
        }

        if (isPanning) {
            setIsPanning(false);
            setStartPos(null);
            return;
        }

        if (selectionBox) {
            const x = Math.min(selectionBox.start.x, selectionBox.current.x);
            const y = Math.min(selectionBox.start.y, selectionBox.current.y);
            const w = Math.abs(selectionBox.current.x - selectionBox.start.x);
            const h = Math.abs(selectionBox.current.y - selectionBox.start.y);

            const selected = elements.filter(el => {
                if (el.type === 'rect' || el.type === 'image') {
                    return el.x >= x && el.x + (el.w || 0) <= x + w &&
                        el.y >= y && el.y + (el.h || 0) <= y + h;
                } else if (el.type === 'circle') {
                    const r = el.radius || 0;
                    return el.x - r >= x && el.x + r <= x + w &&
                        el.y - r >= y && el.y + r <= y + h;
                } else if (el.type === 'text') {
                    // Approximate text bounds
                    return el.x >= x && el.x <= x + w && el.y >= y && el.y <= y + h;
                }
                return false;
            }).map(el => el.id);

            setSelectedElements(selected);
            setSelectionBox(null);
            return;
        }

        if (!isDrawing || !user) return;
        setIsDrawing(false);

        if (tool === 'select' && selectedElements.length > 0) {
            addToHistory(elements);
            emitElements(elements);
            setDragOffset(null);
            return;
        }

        if (!startPos || !currentPos) return;

        let newElement: Element | null = null;

        if (tool === 'rect') {
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            if (Math.abs(w) < 5 || Math.abs(h) < 5) return;
            newElement = {
                id: Date.now().toString(),
                type: 'rect',
                x: startPos.x,
                y: startPos.y,
                w,
                h,
                color: currentColor
            };
        } else if (tool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(currentPos.x - startPos.x, 2) +
                Math.pow(currentPos.y - startPos.y, 2)
            );
            if (radius < 5) return;
            newElement = {
                id: Date.now().toString(),
                type: 'circle',
                x: startPos.x,
                y: startPos.y,
                radius,
                color: currentColor
            };
        }

        if (newElement) {
            const newElements = [...elements, newElement];
            setElements(newElements);
            addToHistory(newElements);
            emitElements(newElements);
            setTool('select');
        }

        setStartPos(null);
        setCurrentPos(null);
    };

    const deleteSelected = async () => {
        if (selectedElements.length === 0) return;
        const newElements = elements.filter(el => {
            if (selectedElements.includes(el.id)) return false;
            if (el.type === 'arrow' && (selectedElements.includes(el.fromId || '') || selectedElements.includes(el.toId || ''))) {
                return false;
            }
            return true;
        });
        setElements(newElements);
        setSelectedElements([]);
        setShowPropertiesPanel(false);
        addToHistory(newElements);
        emitElements(newElements);
        setTool('select');
    };

    const copySelected = () => {
        const selectedEls = elements.filter(el => selectedElements.includes(el.id));
        setClipboard(selectedEls);
    };

    const cutSelected = () => {
        copySelected();
        deleteSelected();
    };

    const paste = async () => {
        if (clipboard.length === 0) return;
        const newElements = clipboard.map(el => ({
            ...el,
            id: Date.now().toString() + Math.random(),
            x: el.x + 20,
            y: el.y + 20
        }));
        const allElements = [...elements, ...newElements];
        setElements(allElements);
        setSelectedElements(newElements.map(el => el.id));
        addToHistory(allElements);
        emitElements(allElements);
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await api.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return res.data.url;
        } catch (err) {
            console.error('Error uploading image:', err);
            return null;
        }
    };

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const imageUrl = await uploadImage(file);
                if (imageUrl) {
                    const newElement: Element = {
                        id: Date.now().toString(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        w: 200,
                        h: 200,
                        imageUrl: imageUrl
                    };
                    const newElements = [...elements, newElement];
                    setElements(newElements);
                    addToHistory(newElements);
                    emitElements(newElements);
                    setTool('select');
                }
            }
        };
        input.click();
    };

    const updateSelectedElements = (updates: Partial<Element>) => {
        if (selectedElements.length === 0) return;
        const newElements = elements.map(el => {
            if (selectedElements.includes(el.id)) {
                return { ...el, ...updates };
            }
            return el;
        });
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const updateSelectedColor = (color: string) => {
        updateSelectedElements({ color });
    };

    const changeShape = (newType: 'rect' | 'circle') => {
        if (selectedElements.length === 0) return;
        const newElements = elements.map(el => {
            if (selectedElements.includes(el.id)) {
                if (el.type === newType) return el;

                const updates: Partial<Element> = { type: newType };

                if (newType === 'circle' && el.type === 'rect') {
                    // Rect to Circle
                    const size = Math.min(el.w || 50, el.h || 50);
                    updates.radius = size / 2;
                    // Center it (Rect x,y is top-left, Circle x,y is center)
                    updates.x = el.x + (el.w || 0) / 2;
                    updates.y = el.y + (el.h || 0) / 2;
                } else if (newType === 'rect' && el.type === 'circle') {
                    // Circle to Rect
                    const r = el.radius || 25;
                    updates.w = r * 2;
                    updates.h = r * 2;
                    // Top-left (Circle x,y is center, Rect x,y is top-left)
                    updates.x = el.x - r;
                    updates.y = el.y - r;
                }
                return { ...el, ...updates };
            }
            return el;
        });
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const updateArrowStyle = (id: string, updates: Partial<Element>) => {
        const newElements = elements.map(el => {
            if (el.id === id) {
                return { ...el, ...updates };
            }
            return el;
        });
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
        setContextMenu(null);
    };

    const toggleVisibility = (id: string) => {
        const newElements = elements.map(el => {
            if (el.id === id) {
                return { ...el, isHidden: !el.isHidden };
            }
            return el;
        });
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'rect': return <Square size={14} />;
            case 'circle': return <Circle size={14} />;
            case 'text': return <Type size={14} />;
            case 'image': return <Search size={14} />;
            case 'arrow': return <ArrowRight size={14} />;
            default: return <Square size={14} />;
        }
    };

    const handleCanvasDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const { x, y } = getCanvasCoords(e as unknown as React.MouseEvent);
            const imageUrl = await uploadImage(file);

            if (imageUrl) {
                const newElement: Element = {
                    id: Date.now().toString(),
                    type: 'image',
                    x: x - 100,
                    y: y - 100,
                    w: 200,
                    h: 200,
                    imageUrl: imageUrl
                };
                const newElements = [...elements, newElement];
                setElements(newElements);
                addToHistory(newElements);
                emitElements(newElements);
            }
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) return;
        setPanOffset(prev => ({
            ...prev,
            y: prev.y - e.deltaY
        }));
    };

    const handleLayerDragStart = (e: React.DragEvent, index: number) => {
        setDraggedLayerIndex(index);
    };

    const handleLayerDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedLayerIndex === null) return;
        if (draggedLayerIndex === targetIndex) return;

        const realSourceIndex = elements.length - 1 - draggedLayerIndex;
        const realTargetIndex = elements.length - 1 - targetIndex;

        const newElements = [...elements];
        const [movedElement] = newElements.splice(realSourceIndex, 1);
        newElements.splice(realTargetIndex, 0, movedElement);

        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
        setDraggedLayerIndex(null);
    };

    const handlersRef = useRef({
        undo, redo, paste, setTool, setSelectedElements,
        copySelected, cutSelected, deleteSelected, handleImageUpload,
        setArrowStart, elements, clipboard, history, historyIndex
    });

    handlersRef.current = {
        undo, redo, paste, setTool, setSelectedElements,
        copySelected, cutSelected, deleteSelected, handleImageUpload,
        setArrowStart, elements, clipboard, history, historyIndex
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const {
                undo, redo, paste, setTool, setSelectedElements,
                copySelected, cutSelected, deleteSelected, handleImageUpload,
                setArrowStart, elements
            } = handlersRef.current;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'v':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        paste();
                    } else {
                        setTool('select');
                    }
                    break;
                case 'r':
                    setTool('rect');
                    break;
                case 'o':
                    setTool('circle');
                    break;
                case 't':
                    setTool('text');
                    break;
                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setSelectedElements(elements.map(el => el.id));
                    } else {
                        setTool('arrow');
                    }
                    break;
                case 'l':
                    setTool('line');
                    break;
                case 'd':
                    setTool('draw');
                    break;
                case 'f':
                    setTool('frame');
                    break;
                case 'i':
                    handleImageUpload();
                    break;
                case 'x':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        cutSelected();
                    }
                    break;
                case 'delete':
                case 'backspace':
                    e.preventDefault();
                    deleteSelected();
                    break;
                case ' ':
                    e.preventDefault();
                    setTool('pan');
                    break;
                case 'escape':
                    setTool('select');
                    setSelectedElements([]);
                    setArrowStart(null);
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ' && handlersRef.current.setTool) {
                // We can't easily check previous tool here without more state tracking
                // But usually space is for pan, so releasing it goes back to select
                // Or we could track 'previousTool' in a ref
                handlersRef.current.setTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []); // Empty dependency array to prevent re-binding

    return (
        <div className="h-[calc(100vh-80px)] bg-zinc-900 rounded-lg border border-border relative overflow-hidden flex">
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {/* Top Group */}
                <div className="bg-card border border-border rounded-lg p-1 flex flex-col gap-1 shadow-lg">
                    <button className="p-2 rounded hover:bg-secondary text-muted-foreground hover:text-foreground relative group">
                        <Plus size={20} />
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Insert (I)</span>
                    </button>
                </div>

                {/* Main Tools Group */}
                <div className="bg-card border border-border rounded-lg p-1 flex flex-col gap-1 shadow-lg">
                    <button
                        onClick={() => setTool('select')}
                        className={`p-2 rounded relative group ${tool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <MousePointer size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">V</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Select</span>
                    </button>

                    <button
                        onClick={() => setTool('rect')}
                        className={`p-2 rounded relative group ${tool === 'rect' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <Square size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">R</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Rectangle</span>
                    </button>

                    <button
                        onClick={() => setTool('circle')}
                        className={`p-2 rounded relative group ${tool === 'circle' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <Circle size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">O</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Circle</span>
                    </button>

                    <button
                        onClick={() => setTool('arrow')}
                        className={`p-2 rounded relative group ${tool === 'arrow' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <ArrowRight size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">A</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Arrow</span>
                    </button>

                    <button
                        onClick={() => setTool('line')}
                        className={`p-2 rounded relative group ${tool === 'line' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <Minus size={20} className="rotate-45" />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">L</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Line</span>
                    </button>

                    <button
                        onClick={() => setTool('draw')}
                        className={`p-2 rounded relative group ${tool === 'draw' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <Activity size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">D</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Draw</span>
                    </button>

                    <button
                        onClick={() => setTool('text')}
                        className={`p-2 rounded relative group ${tool === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                        <Type size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">T</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Text</span>
                    </button>

                    <button
                        onClick={handleImageUpload}
                        className={`p-2 rounded relative group hover:bg-secondary text-muted-foreground hover:text-foreground`}
                    >
                        <Search size={20} />
                        <span className="absolute right-1 bottom-1 text-[8px] font-bold opacity-70">I</span>
                        <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Image</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button
                        onClick={() => setTool('pan')}
                        className={`p-2 rounded border border-border shadow-sm ${tool === 'pan' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary text-muted-foreground'}`}
                        title="Pan (Space)"
                    >
                        <Hand size={20} />
                    </button>
                    <button
                        onClick={() => setShowLayers(!showLayers)}
                        className={`p-2 rounded border border-border shadow-sm ${showLayers ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary text-muted-foreground'}`}
                        title="Layers"
                    >
                        <Layers size={20} />
                    </button>
                </div>

                {showLayers && (
                    <div className="absolute top-16 right-4 w-64 bg-card border border-border rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-100px)] z-20">
                        <div className="p-2 border-b border-border font-bold text-sm flex justify-between items-center">
                            <span>Layers</span>
                            <span className="text-xs text-muted-foreground">{elements.length} elements</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
                            {elements.slice().reverse().map((el, i) => (
                                <div
                                    key={el.id}
                                    draggable
                                    onDragStart={(e) => handleLayerDragStart(e, i)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleLayerDrop(e, i)}
                                    className={`p-2 rounded text-xs flex items-center gap-2 cursor-pointer group ${selectedElements.includes(el.id) ? 'bg-primary/20 text-primary' : 'hover:bg-secondary'}`}
                                    onClick={() => setSelectedElements([el.id])}
                                >
                                    {getIconForType(el.type)}
                                    <span className="truncate flex-1">{el.text || el.type + ' ' + (elements.length - 1 - i)}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }}
                                        className="opacity-0 group-hover:opacity-100 hover:text-foreground text-muted-foreground"
                                    >
                                        {el.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            ))}
                            {elements.length === 0 && (
                                <div className="text-center text-muted-foreground text-xs py-4">No elements</div>
                            )}
                        </div>
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    width={window.innerWidth}
                    height={window.innerHeight}
                    className={
                        tool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' :
                            tool === 'select' ? 'cursor-default' :
                                tool === 'arrow' ? 'cursor-crosshair' :
                                    'cursor-crosshair'
                    }
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCanvasDrop}
                    onWheel={handleWheel}
                />

                {editingElementId && (() => {
                    const el = elements.find(e => e.id === editingElementId);
                    if (!el) return null;

                    const style: React.CSSProperties = {
                        position: 'absolute',
                        left: (el.type === 'circle' ? (el.x - (el.radius || 0)) : el.x) * zoom + panOffset.x,
                        top: (el.type === 'circle' ? (el.y - (el.radius || 0)) : el.y) * zoom + panOffset.y,
                        width: (el.type === 'circle' ? (el.radius || 0) * 2 : (el.w || 0)) * zoom,
                        height: (el.type === 'circle' ? (el.radius || 0) * 2 : (el.h || 0)) * zoom,
                        fontSize: (el.fontSize || 16) * zoom,
                        textAlign: el.textAlign || 'center',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: el.color || 'white',
                        resize: 'none',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        margin: 0,
                    };

                    return (
                        <textarea
                            autoFocus
                            value={el.text || ''}
                            onChange={(e) => {
                                const newElements = elements.map(element =>
                                    element.id === el.id ? { ...element, text: e.target.value } : element
                                );
                                setElements(newElements);
                            }}
                            onBlur={() => {
                                setEditingElementId(null);
                                addToHistory(elements);
                                emitElements(elements);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    setEditingElementId(null);
                                    addToHistory(elements);
                                    emitElements(elements);
                                }
                            }}
                            style={style}
                            className="z-30 bg-black/50 text-center flex items-center justify-center"
                        />
                    );
                })()}

                {contextMenu && (
                    <div
                        className="absolute bg-card border border-border rounded shadow-lg p-1 z-50 flex flex-col min-w-[200px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button onClick={cutSelected} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <Scissors size={14} /> <span>Cut</span> <span className="ml-auto text-muted-foreground">Ctrl X</span>
                        </button>
                        <button onClick={copySelected} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <Copy size={14} /> <span>Copy</span> <span className="ml-auto text-muted-foreground">Ctrl C</span>
                        </button>
                        <button onClick={paste} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <Clipboard size={14} /> <span>Paste</span> <span className="ml-auto text-muted-foreground">Ctrl V</span>
                        </button>
                        <button onClick={() => { copySelected(); paste(); }} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <Copy size={14} /> <span>Duplicate</span> <span className="ml-auto text-muted-foreground">Ctrl D</span>
                        </button>
                        <button onClick={() => setSelectedElements(elements.map(e => e.id))} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <MousePointer size={14} /> <span>Select all</span> <span className="ml-auto text-muted-foreground">Ctrl A</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        <button className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left opacity-50 cursor-not-allowed">
                            <Download size={14} /> <span>Export selection</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        <div className="relative group/order">
                            <button className="w-full flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                                <BringToFront size={14} /> <span>Change Order</span> <ArrowRight size={12} className="ml-auto" />
                            </button>
                            <div className="absolute left-full top-0 ml-1 bg-card border border-border rounded shadow-lg p-1 flex-col min-w-[150px] hidden group-hover/order:flex">
                                <button onClick={() => {
                                    // Bring forward
                                    const idx = elements.findIndex(e => e.id === contextMenu.elementId);
                                    if (idx < elements.length - 1) {
                                        const newEls = [...elements];
                                        [newEls[idx], newEls[idx + 1]] = [newEls[idx + 1], newEls[idx]];
                                        setElements(newEls);
                                        emitElements(newEls);
                                    }
                                }} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                                    <span>Bring forward</span> <span className="ml-auto text-muted-foreground">Ctrl ]</span>
                                </button>
                                <button onClick={() => {
                                    // Send backward
                                    const idx = elements.findIndex(e => e.id === contextMenu.elementId);
                                    if (idx > 0) {
                                        const newEls = [...elements];
                                        [newEls[idx], newEls[idx - 1]] = [newEls[idx - 1], newEls[idx]];
                                        setElements(newEls);
                                        emitElements(newEls);
                                    }
                                }} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                                    <span>Send backward</span> <span className="ml-auto text-muted-foreground">Ctrl [</span>
                                </button>
                                <button onClick={() => {
                                    // Bring to front
                                    const newEls = elements.filter(e => e.id !== contextMenu.elementId);
                                    const el = elements.find(e => e.id === contextMenu.elementId);
                                    if (el) {
                                        newEls.push(el);
                                        setElements(newEls);
                                        emitElements(newEls);
                                    }
                                }} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                                    <span>Bring to front</span> <span className="ml-auto text-muted-foreground">]</span>
                                </button>
                                <button onClick={() => {
                                    // Send to back
                                    const newEls = elements.filter(e => e.id !== contextMenu.elementId);
                                    const el = elements.find(e => e.id === contextMenu.elementId);
                                    if (el) {
                                        newEls.unshift(el);
                                        setElements(newEls);
                                        emitElements(newEls);
                                    }
                                }} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                                    <span>Send to back</span> <span className="ml-auto text-muted-foreground">[</span>
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-border my-1" />

                        <button onClick={deleteSelected} className="flex items-center gap-2 p-2 hover:bg-red-500/10 text-red-500 rounded text-xs text-left">
                            <Trash2 size={14} /> <span>Delete</span> <span className="ml-auto">Del</span>
                        </button>

                        {/* Arrow specific options if arrow is selected */}
                        {elements.find(e => e.id === contextMenu.elementId)?.type === 'arrow' && (
                            <>
                                <div className="h-px bg-border my-1" />
                                <div className="text-[10px] font-bold px-2 py-1 text-muted-foreground">ARROW STYLE</div>
                                <div className="flex gap-1 px-2">
                                    <button
                                        onClick={() => updateArrowStyle(contextMenu.elementId, { arrowType: 'straight' })}
                                        className="p-1 hover:bg-secondary rounded text-xs border border-border flex-1 text-center"
                                    >Straight</button>
                                    <button
                                        onClick={() => updateArrowStyle(contextMenu.elementId, { arrowType: 'elbow' })}
                                        className="p-1 hover:bg-secondary rounded text-xs border border-border flex-1 text-center"
                                    >Elbow</button>
                                    <button
                                        onClick={() => updateArrowStyle(contextMenu.elementId, { arrowType: 'curved' })}
                                        className="p-1 hover:bg-secondary rounded text-xs border border-border flex-1 text-center"
                                    >Curved</button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {selectedElements.length > 0 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-2 flex gap-2 items-center z-50">
                        {/* Stroke Color Picker */}
                        <div className="relative group">
                            <button
                                className="p-2 hover:bg-secondary rounded border border-border"
                                title="Stroke Color"
                            >
                                <div
                                    className="w-4 h-4 rounded-full border border-gray-500"
                                    style={{ backgroundColor: elements.find(el => el.id === selectedElements[0])?.color || '#ffffff' }}
                                />
                            </button>
                            <div className="absolute bottom-full left-0 mb-0 hidden group-hover:block bg-card p-2 rounded border border-border shadow-lg">
                                <input
                                    type="color"
                                    defaultValue={elements.find(el => el.id === selectedElements[0])?.color || '#ffffff'}
                                    onBlur={(e) => updateSelectedColor(e.target.value)}
                                    className="w-32 h-8 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Background Color Picker (for shapes) */}
                        {(elements.find(el => el.id === selectedElements[0])?.type === 'rect' || elements.find(el => el.id === selectedElements[0])?.type === 'circle') && (
                            <div className="relative group">
                                <button
                                    className="p-2 hover:bg-secondary rounded border border-border"
                                    title="Background Color"
                                >
                                    <div
                                        className="w-4 h-4 rounded-sm border border-gray-500"
                                        style={{ backgroundColor: elements.find(el => el.id === selectedElements[0])?.backgroundColor || 'transparent' }}
                                    />
                                </button>
                                <div className="absolute bottom-full left-0 mb-0 hidden group-hover:block bg-card p-2 rounded border border-border shadow-lg flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">Fill:</span>
                                        <input
                                            type="color"
                                            defaultValue={elements.find(el => el.id === selectedElements[0])?.backgroundColor || '#ffffff'}
                                            onBlur={(e) => updateSelectedElements({ backgroundColor: e.target.value })}
                                            className="w-24 h-6 cursor-pointer"
                                        />
                                        <button
                                            onClick={() => updateSelectedElements({ backgroundColor: undefined })}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">Opacity:</span>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.1"
                                            defaultValue={elements.find(el => el.id === selectedElements[0])?.opacity || 1}
                                            onMouseUp={(e) => updateSelectedElements({ opacity: parseFloat((e.target as HTMLInputElement).value) })}
                                            className="w-24"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="w-px h-6 bg-border mx-1" />

                        {/* Text Options */}
                        {(elements.find(el => el.id === selectedElements[0])?.type === 'text' || elements.find(el => el.id === selectedElements[0])?.text) && (
                            <>
                                <div className="relative group">
                                    <button className="p-1.5 rounded hover:bg-secondary text-xs font-bold w-8 flex items-center justify-center">
                                        Aa
                                    </button>
                                    <div className="absolute bottom-full left-0 mb-0 hidden group-hover:flex flex-col bg-card p-2 rounded border border-border shadow-lg gap-2 min-w-[180px]">
                                        {/* Text Color */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs w-8">Color:</span>
                                            <input
                                                type="color"
                                                defaultValue={elements.find(el => el.id === selectedElements[0])?.textColor || elements.find(el => el.id === selectedElements[0])?.color || '#ffffff'}
                                                onBlur={(e) => updateSelectedElements({ textColor: e.target.value })}
                                                className="flex-1 h-6 cursor-pointer"
                                            />
                                        </div>

                                        <div className="w-full h-px bg-border" />

                                        {/* Font Size */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs w-8">Size:</span>
                                            <input
                                                type="range"
                                                min="12"
                                                max="72"
                                                defaultValue={elements.find(el => el.id === selectedElements[0])?.fontSize || 16}
                                                onMouseUp={(e) => updateSelectedElements({ fontSize: parseInt((e.target as HTMLInputElement).value) })}
                                                className="flex-1 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-xs w-4 text-right">{elements.find(el => el.id === selectedElements[0])?.fontSize || 16}</span>
                                        </div>

                                        <div className="w-full h-px bg-border" />

                                        {/* Text Wrap */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="textWrap"
                                                checked={elements.find(el => el.id === selectedElements[0])?.textWrap || false}
                                                onChange={(e) => updateSelectedElements({ textWrap: e.target.checked })}
                                                className="cursor-pointer"
                                            />
                                            <label htmlFor="textWrap" className="text-xs cursor-pointer select-none">Wrap Text</label>
                                        </div>

                                        <div className="w-full h-px bg-border" />

                                        {/* Font Family */}
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => updateSelectedElements({ fontFamily: 'Arial' })} className="text-left px-2 py-1 hover:bg-secondary rounded text-xs font-sans">Sans</button>
                                            <button onClick={() => updateSelectedElements({ fontFamily: 'Times New Roman' })} className="text-left px-2 py-1 hover:bg-secondary rounded text-xs font-serif">Serif</button>
                                            <button onClick={() => updateSelectedElements({ fontFamily: 'Courier New' })} className="text-left px-2 py-1 hover:bg-secondary rounded text-xs font-mono">Mono</button>
                                            <button onClick={() => updateSelectedElements({ fontFamily: 'Brush Script MT' })} className="text-left px-2 py-1 hover:bg-secondary rounded text-xs italic">Hand</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex bg-secondary/50 rounded p-1 gap-1">
                                    <button
                                        onClick={() => updateSelectedElements({ textAlign: 'left' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.textAlign === 'left' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Align Left"
                                    >
                                        <AlignLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ textAlign: 'center' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.textAlign === 'center' || !elements.find(el => el.id === selectedElements[0])?.textAlign ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Align Center"
                                    >
                                        <AlignCenter size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ textAlign: 'right' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.textAlign === 'right' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Align Right"
                                    >
                                        <AlignRight size={16} />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-border mx-1" />
                            </>
                        )}

                        {/* Shape Options */}
                        {(elements.find(el => el.id === selectedElements[0])?.type === 'rect' || elements.find(el => el.id === selectedElements[0])?.type === 'circle') && (
                            <>
                                <div className="flex bg-secondary/50 rounded p-1 gap-1">
                                    <button
                                        onClick={() => changeShape('rect')}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'rect' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Rectangle"
                                    >
                                        <Square size={16} />
                                    </button>
                                    <button
                                        onClick={() => changeShape('circle')}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'circle' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Circle"
                                    >
                                        <Circle size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 px-1">
                                    <Minus size={14} className="text-muted-foreground" />
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        defaultValue={elements.find(el => el.id === selectedElements[0])?.strokeWidth || 2}
                                        onMouseUp={(e) => updateSelectedElements({ strokeWidth: parseInt((e.target as HTMLInputElement).value) })}
                                        className="w-16 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>

                                <div className="w-px h-6 bg-border mx-1" />
                            </>
                        )}

                        {/* Arrow Specific Controls */}
                        {elements.find(el => el.id === selectedElements[0])?.type === 'arrow' && (
                            <>
                                {/* Arrow Type */}
                                <div className="flex bg-secondary/50 rounded p-1 gap-1">
                                    <button
                                        onClick={() => updateSelectedElements({ arrowType: 'straight' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowType === 'straight' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Straight"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ arrowType: 'elbow' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowType === 'elbow' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Elbow"
                                    >
                                        <CornerDownRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ arrowType: 'curved' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowType === 'curved' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Curved"
                                    >
                                        <Activity size={16} />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-border mx-1" />

                                {/* Line Style */}
                                <div className="flex bg-secondary/50 rounded p-1 gap-1">
                                    <button
                                        onClick={() => updateSelectedElements({ lineStyle: 'solid' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.lineStyle === 'solid' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Solid"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="8" x2="14" y2="8" /></svg>
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ lineStyle: 'dashed' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.lineStyle === 'dashed' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Dashed"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="14" y2="8" /></svg>
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ lineStyle: 'dotted' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.lineStyle === 'dotted' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Dotted"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="3" cy="8" r="1" /><circle cx="8" cy="8" r="1" /><circle cx="13" cy="8" r="1" /></svg>
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-border mx-1" />

                                {/* Arrow Heads */}
                                <div className="flex bg-secondary/50 rounded p-1 gap-1">
                                    <button
                                        onClick={() => updateSelectedElements({ arrowHead: 'none' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowHead === 'none' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="None"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ arrowHead: 'start' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowHead === 'start' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Start"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ arrowHead: 'end' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowHead === 'end' || !elements.find(el => el.id === selectedElements[0])?.arrowHead ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="End"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                    <button
                                        onClick={() => updateSelectedElements({ arrowHead: 'both' })}
                                        className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.arrowHead === 'both' ? 'bg-primary text-primary-foreground' : ''}`}
                                        title="Both"
                                    >
                                        <ArrowLeftRight size={16} />
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="w-px h-6 bg-border mx-1" />

                        <button
                            onClick={deleteSelected}
                            className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded text-destructive"
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}

                {showPropertiesPanel && selectedElements.length > 0 && (
                    <div className="hidden"></div>
                )}
            </div>
        </div>
    );
};
export default Board;
