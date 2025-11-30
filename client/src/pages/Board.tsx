import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
    Square, Circle, Type, Image as ImageIcon, Trash2, MousePointer,
    ArrowRight, Copy, Clipboard, Palette, Undo, Redo, Hand
} from 'lucide-react';

type Tool = 'select' | 'rect' | 'circle' | 'text' | 'image' | 'arrow' | 'pan';

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
}

const Board = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const saveTimeoutRef = useRef<number | null>(null);

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
    const [arrowStart, setArrowStart] = useState<{ elementId: string, point: ConnectionPoint } | null>(null);
    const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{ elementId: string, point: ConnectionPoint } | null>(null);

    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const zoom = 1;

    useEffect(() => {
        const fetchBoard = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/boards/${id}`, {
                    headers: { token: "Bearer " + user.token },
                });
                const loadedElements = res.data.elements || [];
                setElements(loadedElements);
                setHistory([loadedElements]);
                setHistoryIndex(0);
            } catch (err) {
                console.log(err);
            }
        };
        fetchBoard();

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [id, user]);

    const saveElements = async (elementsToSave: Element[]) => {
        if (!user) return;
        try {
            await axios.put(`http://localhost:5000/api/boards/${id}`, { elements: elementsToSave }, {
                headers: { token: "Bearer " + user.token },
            });
        } catch (err) {
            console.log(err);
        }
    };

    const debouncedSave = (elementsToSave: Element[]) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveElements(elementsToSave);
        }, 1000);
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
            saveElements(history[newIndex]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setElements(history[newIndex]);
            saveElements(history[newIndex]);
        }
    };

    const getConnectionPoints = (el: Element): ConnectionPoint[] => {
        if (el.type === 'rect') {
            const centerX = el.x + (el.w || 0) / 2;
            const centerY = el.y + (el.h || 0) / 2;
            return [
                { x: centerX, y: el.y, position: 'top' },
                { x: el.x + (el.w || 0), y: centerY, position: 'right' },
                { x: centerX, y: el.y + (el.h || 0), position: 'bottom' },
                { x: el.x, y: centerY, position: 'left' },
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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoom, zoom);

        elements.filter(el => el.type === 'arrow').forEach(el => {
            const fromEl = elements.find(e => e.id === el.fromId);
            const toEl = elements.find(e => e.id === el.toId);
            if (!fromEl || !toEl) return;

            const fromPoints = getConnectionPoints(fromEl);
            const toPoints = getConnectionPoints(toEl);
            const fromPoint = fromPoints.find(p => p.position === el.fromPoint?.position) || fromPoints[0];
            const toPoint = toPoints.find(p => p.position === el.toPoint?.position) || toPoints[0];

            ctx.strokeStyle = el.color || 'white';
            ctx.lineWidth = selectedElements.includes(el.id) ? 3 : 2;
            ctx.beginPath();
            ctx.moveTo(fromPoint.x, fromPoint.y);
            ctx.lineTo(toPoint.x, toPoint.y);
            ctx.stroke();

            const angle = Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x);
            const headLength = 15;
            ctx.beginPath();
            ctx.moveTo(toPoint.x, toPoint.y);
            ctx.lineTo(
                toPoint.x - headLength * Math.cos(angle - Math.PI / 6),
                toPoint.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(toPoint.x, toPoint.y);
            ctx.lineTo(
                toPoint.x - headLength * Math.cos(angle + Math.PI / 6),
                toPoint.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
        });

        elements.filter(el => el.type !== 'arrow').forEach(el => {
            const isSelected = selectedElements.includes(el.id);

            if (el.type === 'rect') {
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = isSelected ? 3 : 2;
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
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.beginPath();
                ctx.arc(el.x, el.y, el.radius || 0, 0, 2 * Math.PI);
                ctx.stroke();

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
                ctx.fillStyle = el.color || 'white';
                ctx.font = '16px Arial';
                ctx.fillText(el.text || '', el.x, el.y);
                if (isSelected) {
                    ctx.strokeStyle = '#60a5fa';
                    const textWidth = ctx.measureText(el.text || '').width;
                    ctx.strokeRect(el.x - 2, el.y - 18, textWidth + 4, 20);
                }
            } else if (el.type === 'image' && el.imageUrl) {
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
            }
        });

        if (tool === 'arrow' && arrowStart && currentPos) {
            const fromEl = elements.find(e => e.id === arrowStart.elementId);
            if (fromEl) {
                ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(arrowStart.point.x, arrowStart.point.y);
                ctx.lineTo(currentPos.x, currentPos.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        if (isDrawing && startPos && currentPos && tool !== 'select' && tool !== 'pan' && tool !== 'arrow') {
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
    }, [elements, isDrawing, startPos, currentPos, tool, selectedElements, panOffset, zoom, arrowStart, hoveredConnectionPoint]);

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
                    ctx.font = '16px Arial';
                    const textWidth = ctx.measureText(el.text || '').width;
                    if (x >= el.x && x <= el.x + textWidth && y >= el.y - 16 && y <= el.y) {
                        return el;
                    }
                }
            } else if (el.type === 'image') {
                if (x >= el.x && x <= el.x + (el.w || 200) && y >= el.y && y <= el.y + (el.h || 200)) {
                    return el;
                }
            }
        }
        return null;
    };

    const getConnectionPointAtPosition = (x: number, y: number): { element: Element, point: ConnectionPoint } | null => {
        for (const el of elements) {
            if (el.type === 'arrow') continue;
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

    const handleMouseMove = (e: React.MouseEvent) => {
        const { x, y } = getCanvasCoords(e);

        if (tool === 'arrow') {
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
            if (tool === 'arrow' && arrowStart) {
                setCurrentPos({ x, y });
            }
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
        const { x, y } = getCanvasCoords(e);

        if (tool === 'pan' || e.button === 1) {
            setIsPanning(true);
            setStartPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            return;
        }

        if (tool === 'arrow') {
            const connection = getConnectionPointAtPosition(x, y);
            if (connection && !arrowStart) {
                setArrowStart({ elementId: connection.element.id, point: connection.point });
                setCurrentPos({ x, y });
                setTool('arrow');
            } else if (connection && arrowStart && connection.element.id !== arrowStart.elementId) {
                const newElement: Element = {
                    id: Date.now().toString(),
                    type: 'arrow',
                    x: 0,
                    y: 0,
                    fromId: arrowStart.elementId,
                    toId: connection.element.id,
                    fromPoint: arrowStart.point,
                    toPoint: connection.point,
                    color: currentColor
                };
                const newElements = [...elements, newElement];
                setElements(newElements);
                addToHistory(newElements);
                saveElements(newElements);
                setArrowStart(null);
                setCurrentPos(null);
                setTool('select');
            }
            return;
        }

        if (tool === 'select') {
            const connection = getConnectionPointAtPosition(x, y);
            if (connection) {
                setArrowStart({ elementId: connection.element.id, point: connection.point });
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
                saveElements(newElements);
                setTool('select');
            }
        } else {
            setIsDrawing(true);
            setStartPos({ x, y });
            setCurrentPos({ x, y });
        }
    };

    const stopDrawing = async () => {
        if (isPanning) {
            setIsPanning(false);
            setStartPos(null);
            return;
        }

        if (!isDrawing || !user) return;
        setIsDrawing(false);

        if (tool === 'select' && selectedElements.length > 0) {
            addToHistory(elements);
            await saveElements(elements);
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
            await saveElements(newElements);
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
        await saveElements(newElements);
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
        await saveElements(allElements);
    };

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const newElement: Element = {
                        id: Date.now().toString(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        w: 200,
                        h: 200,
                        imageUrl: event.target?.result as string
                    };
                    const newElements = [...elements, newElement];
                    setElements(newElements);
                    addToHistory(newElements);
                    saveElements(newElements);
                    setTool('select');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const updateSelectedColor = (color: string) => {
        if (selectedElements.length === 0) return;
        const newElements = elements.map(el => {
            if (selectedElements.includes(el.id)) {
                return { ...el, color };
            }
            return el;
        });
        setElements(newElements);
        addToHistory(newElements);
        debouncedSave(newElements);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

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
                case 'r':
                    setTool('rect');
                    break;
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        copySelected();
                    } else {
                        setTool('circle');
                    }
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
                case 'v':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        paste();
                    }
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
            if (e.key === ' ' && tool === 'pan') {
                setTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [tool, selectedElements, elements, clipboard, historyIndex, history]);

    return (
        <div className="h-[calc(100vh-80px)] bg-gray-950 rounded-lg border border-border relative overflow-hidden flex">
            <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
                <button
                    onClick={() => setTool('select')}
                    className={`p-3 rounded ${tool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Select (V)"
                >
                    <MousePointer size={20} />
                </button>
                <button
                    onClick={() => setTool('pan')}
                    className={`p-3 rounded ${tool === 'pan' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Pan (Space)"
                >
                    <Hand size={20} />
                </button>

                <div className="w-10 h-px bg-border my-1" />

                <button
                    onClick={() => setTool('rect')}
                    className={`p-3 rounded ${tool === 'rect' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Rectangle (R)"
                >
                    <Square size={20} />
                </button>
                <button
                    onClick={() => setTool('circle')}
                    className={`p-3 rounded ${tool === 'circle' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Circle (C)"
                >
                    <Circle size={20} />
                </button>
                <button
                    onClick={() => setTool('arrow')}
                    className={`p-3 rounded ${tool === 'arrow' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Arrow (A)"
                >
                    <ArrowRight size={20} />
                </button>
                <button
                    onClick={() => setTool('text')}
                    className={`p-3 rounded ${tool === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                    title="Text (T)"
                >
                    <Type size={20} />
                </button>
                <button
                    onClick={handleImageUpload}
                    className="p-3 rounded hover:bg-secondary"
                    title="Upload Image"
                >
                    <ImageIcon size={20} />
                </button>

                <div className="w-10 h-px bg-border my-1" />

                <div className="relative">
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="p-3 rounded hover:bg-secondary"
                        title="Color"
                    >
                        <Palette size={20} />
                    </button>
                    <div
                        className="absolute bottom-0 left-2 w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: currentColor }}
                    />
                    {showColorPicker && (
                        <div className="absolute left-16 top-0 bg-card p-2 rounded border border-border shadow-lg z-50">
                            <input
                                type="color"
                                value={currentColor}
                                onChange={(e) => setCurrentColor(e.target.value)}
                                className="w-32 h-8"
                            />
                        </div>
                    )}
                </div>

                <div className="w-10 h-px bg-border my-1" />

                <button
                    onClick={undo}
                    disabled={historyIndex === 0}
                    className="p-3 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={20} />
                </button>
                <button
                    onClick={redo}
                    disabled={historyIndex === history.length - 1}
                    className="p-3 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo size={20} />
                </button>

                <div className="w-10 h-px bg-border my-1" />

                <button
                    onClick={copySelected}
                    disabled={selectedElements.length === 0}
                    className="p-3 rounded hover:bg-secondary disabled:opacity-30"
                    title="Copy (Ctrl+C)"
                >
                    <Copy size={20} />
                </button>
                <button
                    onClick={paste}
                    disabled={clipboard.length === 0}
                    className="p-3 rounded hover:bg-secondary disabled:opacity-30"
                    title="Paste (Ctrl+V)"
                >
                    <Clipboard size={20} />
                </button>
                <button
                    onClick={deleteSelected}
                    disabled={selectedElements.length === 0}
                    className="p-3 rounded hover:bg-destructive disabled:opacity-30"
                    title="Delete (Del)"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            <div className="flex-1 relative">
                <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-2 px-3 rounded border border-border z-10">
                    <div className="text-xs text-muted-foreground">
                        {tool === 'select' && 'Click to select, drag to move'}
                        {tool === 'arrow' && (arrowStart ? 'Click a connection point to finish arrow' : 'Click a connection point to start arrow')}
                        {tool === 'pan' && 'Drag to pan canvas'}
                        {tool === 'rect' && 'Drag to draw rectangle'}
                        {tool === 'circle' && 'Drag to draw circle'}
                        {tool === 'text' && 'Click to add text'}
                        {selectedElements.length > 0 && ` • ${selectedElements.length} selected`}
                    </div>
                </div>

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
                />

                {showPropertiesPanel && selectedElements.length > 0 && (
                    <div className="absolute top-20 right-4 bg-card p-4 rounded-lg border border-border shadow-lg z-20 w-64">
                        <h3 className="text-sm font-semibold mb-3">Properties</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Border Color</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={elements.find(el => el.id === selectedElements[0])?.color || '#ffffff'}
                                        onChange={(e) => updateSelectedColor(e.target.value)}
                                        className="w-full h-8 rounded cursor-pointer"
                                    />
                                    <div
                                        className="w-8 h-8 rounded border border-border"
                                        style={{ backgroundColor: elements.find(el => el.id === selectedElements[0])?.color || '#ffffff' }}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                                {selectedElements.length} element{selectedElements.length > 1 ? 's' : ''} selected
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default Board;
