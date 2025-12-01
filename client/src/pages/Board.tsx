import { useContext, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { appConfig } from '../config';
import api from '../utils/api';
import Collaborator from '../utils/board/action/collaborator';

import {
    Square, Circle, Type, Trash2, MousePointer2,
    ArrowRight, Hand,
    Minus, CornerDownRight, Activity, ArrowLeft, ArrowLeftRight,
    Search, AlignLeft, AlignCenter, AlignRight,
    Layers, Eye, EyeOff, Copy, Scissors, Clipboard,
    BringToFront, Download,
    Share2, Menu, User, LayoutDashboard, LogOut, X, Globe, Lock, Image, MoreVertical,
    Triangle, Diamond, Hexagon, Star
} from 'lucide-react';

// Import types and utilities from modular board utilities
import type {
    Tool,
    Element,
    ConnectionPoint,
    ResizeHandle,
} from '../utils/board/types';

import {
    // Arrow utilities
    getArrowHandles,
    getConnectionPointAtPosition,

    // Element utilities
    getResizeHandles,
    getCursorForHandle,
    getElementAtPosition as getElementAtPos,
    updateElements,
    deleteElements as deleteElementsUtil,
    changeElementShape,
    toggleElementVisibility,

    // History utilities
    addToHistory as addToHistoryUtil,

    // Clipboard utilities
    copyElements,
    cutElements,
    pasteElements,

    // Image utilities
    uploadImage as uploadImageUtil,

    // Canvas utilities
    drawRoundedRect,
    drawTriangle,
    drawDiamond,
    drawHexagon,
    drawStar,
    drawArrow,
    drawConnectionPoints,
    drawText,

    // Socket utilities
    emitElements as emitElementsUtil,
} from '../utils/board';

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
    const [currentColor] = useState('#ffffff');
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
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    // Board Metadata State
    const [boardTitle, setBoardTitle] = useState('Untitled Board');
    const [visibility, setVisibility] = useState<'private' | 'public-view' | 'public-edit'>('private');
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showMenuDropdown, setShowMenuDropdown] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
    const [activeCollaboratorMenu, setActiveCollaboratorMenu] = useState<string | null>(null);


    useEffect(() => {
        const fetchBoard = async () => {
            if (!user) return;
            try {
                const res = await api.get(`/api/boards/${id}`);
                const loadedElements = res.data.elements || [];
                setElements(loadedElements);
                setBoardTitle(res.data.title || 'Untitled Board');
                setVisibility(res.data.visibility || 'private');

                // Merge editors and viewers into collaborators state
                const editors = (res.data.editors || []).map((u: any) => ({ user: u, role: 'editor' }));
                const viewers = (res.data.viewers || []).map((u: any) => ({ user: u, role: 'viewer' }));
                setCollaborators([...editors, ...viewers]);

                setOwnerId(res.data.user || null);
                setHistory([loadedElements]);
                setHistoryIndex(0);
            } catch (err) {
                console.log(err);
            }
        };
        fetchBoard();

        // Setup Socket.IO connection
        if (!socketRef.current && id) {
            console.debug('Connecting to Socket.IO...');
            const token = user?.token;
            const socket = io(appConfig.API_URL, {
                auth: { token: `Bearer ${token}` }
            });
            socketRef.current = socket;

            // Join the board room
            socket.emit('join-board', id);
            console.debug('Joined board room:', id);

            // Listen for updates from other users
            socket.on('elements-updated', (updatedElements: Element[]) => {
                console.debug('📡 Received elements update from another user');
                setElements(updatedElements);
                addToHistory(updatedElements);
            });

            socket.on('user-joined', (data: any) => {
                console.debug('👋 User joined:', data.userId);
            });

            socket.on('user-left', (data: any) => {
                console.debug('👋 User left:', data.userId);
            });
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (socketRef.current) {
                console.debug('Disconnecting from Socket.IO...');
                socketRef.current.emit('leave-board', id);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [id, user]);

    const emitElements = (els: Element[]) => {
        if (!socketRef.current) return;
        emitElementsUtil(socketRef.current, id!, els);
    };

    const addToHistory = (els: Element[]) => {
        const { history: newHistory, historyIndex: newIndex } = addToHistoryUtil(history, historyIndex, els);
        setHistory(newHistory);
        setHistoryIndex(newIndex);
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

    const isReadOnly = () => {
        if (!user || !ownerId) return true; // Loading or not logged in
        if (user._id === ownerId) return false; // Owner
        if (visibility === 'public-edit') return false; // Public Edit
        const collaborator = collaborators.find(c => {
            const cUserId = c.user?._id || c.user;
            return cUserId === user._id;
        });
        if (collaborator && collaborator.role === 'editor') return false; // Editor
        return true; // Everyone else (viewer, public-view, private)
    };

    const handleRemoveCollaborator = async (userId: string) => {
        Collaborator.handleRemoveCollaborator({
            id: id!,
            collaborators,
            setCollaborators,
            userId,
            isReadOnly,
            setActiveCollaboratorMenu
        });
    };

    const handleUpdateCollaboratorRole = async (userId: string, newRole: 'viewer' | 'editor') => {

        Collaborator.handleUpdateCollaboratorRole({
            id: id!,
            collaborators,
            setCollaborators,
            userId,
            isReadOnly,
            setActiveCollaboratorMenu
        }, newRole);
    };

    const getCanvasCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - panOffset.x) / zoom,
            y: (e.clientY - rect.top - panOffset.y) / zoom
        };

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
                drawArrow(ctx, el, elements, isSelected);
            } else if (el.type === 'rect') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    drawRoundedRect(ctx, el.x, el.y, el.w || 0, el.h || 0, 8);
                    ctx.fill();
                }
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                drawRoundedRect(ctx, el.x, el.y, el.w || 0, el.h || 0, 8);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x + (el.w || 0) / 2;
                    if (el.textAlign === 'left') textX = el.x + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.w || 0) - 10;

                    drawText(ctx, el.text, textX, el.y + (el.h || 0) / 2, (el.w || 0) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
            } else if (el.type === 'triangle') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    drawTriangle(ctx, el.x, el.y, el.w || 0, el.h || 0);
                    ctx.fill();
                }
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                drawTriangle(ctx, el.x, el.y, el.w || 0, el.h || 0);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x + (el.w || 0) / 2;
                    if (el.textAlign === 'left') textX = el.x + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.w || 0) - 10;

                    drawText(ctx, el.text, textX, el.y + (el.h || 0) / 2, (el.w || 0) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
            } else if (el.type === 'diamond') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    drawDiamond(ctx, el.x, el.y, el.w || 0, el.h || 0);
                    ctx.fill();
                }
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                drawDiamond(ctx, el.x, el.y, el.w || 0, el.h || 0);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x + (el.w || 0) / 2;
                    if (el.textAlign === 'left') textX = el.x + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.w || 0) - 10;

                    drawText(ctx, el.text, textX, el.y + (el.h || 0) / 2, (el.w || 0) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
            } else if (el.type === 'hexagon') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    drawHexagon(ctx, el.x, el.y, el.w || 0, el.h || 0);
                    ctx.fill();
                }
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                drawHexagon(ctx, el.x, el.y, el.w || 0, el.h || 0);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x + (el.w || 0) / 2;
                    if (el.textAlign === 'left') textX = el.x + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.w || 0) - 10;

                    drawText(ctx, el.text, textX, el.y + (el.h || 0) / 2, (el.w || 0) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
            } else if (el.type === 'star') {
                ctx.globalAlpha = el.opacity || 1;
                if (el.backgroundColor) {
                    ctx.fillStyle = el.backgroundColor;
                    drawStar(ctx, el.x, el.y, el.w || 0, el.h || 0);
                    ctx.fill();
                }
                ctx.strokeStyle = el.color || 'white';
                ctx.lineWidth = (el.strokeWidth || 2) + (isSelected ? 1 : 0);
                drawStar(ctx, el.x, el.y, el.w || 0, el.h || 0);
                ctx.stroke();
                ctx.globalAlpha = 1;

                if (el.text && el.id !== editingElementId) {
                    ctx.fillStyle = el.textColor || el.color || 'white';
                    const fontSize = el.fontSize || 16;
                    ctx.font = `${fontSize}px ${el.fontFamily || 'Arial'}`;
                    ctx.textAlign = el.textAlign || 'center';
                    ctx.textBaseline = 'middle';

                    let textX = el.x + (el.w || 0) / 2;
                    if (el.textAlign === 'left') textX = el.x + 10;
                    if (el.textAlign === 'right') textX = el.x + (el.w || 0) - 10;

                    drawText(ctx, el.text, textX, el.y + (el.h || 0) / 2, (el.w || 0) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
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

                    drawText(ctx, el.text, textX, el.y, ((el.radius || 0) * 2) - 20, fontSize, el.textAlign || 'center', el.textWrap || false);
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
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

                // Use cached image or create new one
                let img = imageCache.current.get(el.imageUrl);
                if (!img) {
                    img = new window.Image();
                    img.src = el.imageUrl;
                    imageCache.current.set(el.imageUrl, img);

                    // Set up load handler only once
                    img.onload = () => {
                        // Force a redraw by requesting animation frame
                        requestAnimationFrame(() => {
                            // The useEffect dependency on elements will handle the redraw
                        });
                    };
                    img.onerror = () => {
                        console.error('Failed to load image:', el.imageUrl);
                    };
                }

                // Draw if loaded
                if (img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, el.x, el.y, el.w || 200, el.h || 200);
                    if (isSelected) {
                        ctx.strokeStyle = '#60a5fa';
                        ctx.lineWidth = 3;
                        ctx.strokeRect(el.x, el.y, el.w || 200, el.h || 200);
                    }
                }

                if (tool === 'arrow' || isSelected) {
                    drawConnectionPoints(ctx, el, hoveredConnectionPoint);
                }
            }

            ctx.globalAlpha = 1;

            ctx.globalAlpha = 1;

            if (isSelected && (el.type === 'rect' || el.type === 'circle' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star')) {
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
                const handles = getArrowHandles(el, elements);
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
                drawRoundedRect(ctx, startPos.x, startPos.y, w, h, 8);
                ctx.stroke();
            } else if (tool === 'triangle') {
                const w = currentPos.x - startPos.x;
                const h = currentPos.y - startPos.y;
                drawTriangle(ctx, startPos.x, startPos.y, w, h);
                ctx.stroke();
            } else if (tool === 'diamond') {
                const w = currentPos.x - startPos.x;
                const h = currentPos.y - startPos.y;
                drawDiamond(ctx, startPos.x, startPos.y, w, h);
                ctx.stroke();
            } else if (tool === 'hexagon') {
                const w = currentPos.x - startPos.x;
                const h = currentPos.y - startPos.y;
                drawHexagon(ctx, startPos.x, startPos.y, w, h);
                ctx.stroke();
            } else if (tool === 'star') {
                const w = currentPos.x - startPos.x;
                const h = currentPos.y - startPos.y;
                drawStar(ctx, startPos.x, startPos.y, w, h);
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

    const handleDoubleClick = (e: React.MouseEvent) => {
        const { x, y } = getCanvasCoords(e);
        const element = getElementAtPos(x, y, elements);
        if (element && (element.type === 'rect' || element.type === 'circle' || element.type === 'triangle' || element.type === 'diamond' || element.type === 'hexagon' || element.type === 'star')) {
            setEditingElementId(element.id);
            setTool('select');
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);
        const element = getElementAtPos(x, y, elements);

        setContextMenu({ x: e.clientX, y: e.clientY, elementId: element ? element.id : '' });

        if (element) {
            if (!selectedElements.includes(element.id)) {
                setSelectedElements([element.id]);
            }
        } else {
            setSelectedElements([]);
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
                            const connection = getConnectionPointAtPosition(x, y, elements);
                            if (connection) {
                                return { ...e, startPoint: undefined, fromId: connection.element.id, fromPoint: connection.point };
                            } else {
                                return { ...e, startPoint: { x, y }, fromId: undefined, fromPoint: undefined };
                            }
                        } else if (arrowHandle.type === 'end') {
                            const connection = getConnectionPointAtPosition(x, y, elements);
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
            const connection = getConnectionPointAtPosition(x, y, elements);
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

        if (isReadOnly() && tool !== 'pan') return;

        const { x, y } = getCanvasCoords(e);

        if (selectedElements.length === 1) {
            const el = elements.find(e => e.id === selectedElements[0]);
            if (el) {
                if (el.type === 'rect' || el.type === 'circle' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star') {
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
                    const handles = getArrowHandles(el, elements);
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
            const connection = getConnectionPointAtPosition(x, y, elements);
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
                    arrowType: tool === 'line' ? 'straight' : 'curved'
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
            const connection = getConnectionPointAtPosition(x, y, elements);
            if (connection) {
                setArrowStart({ x: connection.point.x, y: connection.point.y, elementId: connection.element.id, point: connection.point });
                setCurrentPos({ x, y });
                setTool('arrow');
                return;
            }

            const element = getElementAtPos(x, y, elements);
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
                if (el.type === 'rect' || el.type === 'image' || el.type === 'triangle' || el.type === 'diamond' || el.type === 'hexagon' || el.type === 'star') {
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

    const deleteSelected = () => {
        if (isReadOnly()) return;
        const newElements = deleteElementsUtil(elements, selectedElements);
        setElements(newElements);
        setSelectedElements([]);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const copySelected = () => {
        const selectedEls = copyElements(elements, selectedElements);
        if (selectedEls.length > 0) {
            navigator.clipboard.writeText(JSON.stringify(selectedEls));
        }
    };

    const cutSelected = () => {
        if (isReadOnly()) return;
        const { clipboard, remainingElements } = cutElements(elements, selectedElements);
        if (clipboard.length > 0) {
            navigator.clipboard.writeText(JSON.stringify(clipboard));
            setElements(remainingElements);
            setSelectedElements([]);
            addToHistory(remainingElements);
            emitElements(remainingElements);
        }
    };

    const paste = async () => {
        if (isReadOnly()) return;
        try {
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    if (item.types.some(type => type.startsWith('image/'))) {
                        const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
                        const file = new File([blob], "pasted-image.png", { type: blob.type });
                        const imageUrl = await uploadImage(file);
                        if (imageUrl) {
                            const x = -panOffset.x / zoom + 100;
                            const y = -panOffset.y / zoom + 100;
                            const newElement: Element = {
                                id: Date.now().toString(),
                                type: 'image',
                                x,
                                y,
                                w: 200,
                                h: 200,
                                imageUrl: imageUrl
                            };
                            const newElements = [...elements, newElement];
                            setElements(newElements);
                            addToHistory(newElements);
                            emitElements(newElements);
                            return;
                        }
                    }
                }
            } catch (readError) {
                console.warn("Clipboard read failed, falling back to text", readError);
            }

            const text = await navigator.clipboard.readText();
            const clipboardEls = JSON.parse(text) as Element[];
            if (Array.isArray(clipboardEls) && clipboardEls.length > 0) {
                const pastedEls = pasteElements(clipboardEls, { x: 20, y: 20 });
                const newElements = [...elements, ...pastedEls];
                setElements(newElements);
                setSelectedElements(pastedEls.map(e => e.id));
                addToHistory(newElements);
                emitElements(newElements);
            }
        } catch (err) {
            console.error('Failed to paste:', err);
        }
    };

    const uploadImage = async (file: File) => {
        const url = await uploadImageUtil(file);
        return url;
    };

    const handleImageUpload = () => {
        if (isReadOnly()) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                console.log('Uploading image:', file.name);
                const imageUrl = await uploadImage(file);
                console.log('Image uploaded, URL:', imageUrl);
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
                    console.log('Creating image element:', newElement);
                    const newElements = [...elements, newElement];
                    setElements(newElements);
                    addToHistory(newElements);
                    emitElements(newElements);
                    setTool('select');
                    console.log('Image element added to board');
                } else {
                    console.error('Image upload returned null URL');
                    alert('Failed to upload image. Please try again.');
                }
            }
        };
        input.click();
    };

    const updateSelectedElements = (updates: Partial<Element>) => {
        if (isReadOnly()) return;
        if (selectedElements.length === 0) return;
        const newElements = updateElements(elements, selectedElements, updates);
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const updateSelectedColor = (color: string) => {
        updateSelectedElements({ color });
    };

    const changeShape = (newType: 'rect' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star') => {
        if (isReadOnly()) return;
        if (selectedElements.length === 0) return;
        const newElements = changeElementShape(elements, selectedElements, newType);
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const updateArrowStyle = (id: string, updates: Partial<Element>) => {
        if (isReadOnly()) return;
        const newElements = updateElements(elements, [id], updates);
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
        setContextMenu(null);
    };

    const toggleVisibility = (id: string) => {
        if (isReadOnly()) return;
        const newElements = toggleElementVisibility(elements, id);
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'rect': return <Square size={14} />;
            case 'circle': return <Circle size={14} />;
            case 'triangle': return <Triangle size={14} />;
            case 'diamond': return <Diamond size={14} />;
            case 'hexagon': return <Hexagon size={14} />;
            case 'star': return <Star size={14} />;
            case 'text': return <Type size={14} />;
            case 'image': return <Search size={14} />;
            case 'arrow': return <ArrowRight size={14} />;
            default: return <Square size={14} />;
        }
    };

    const handleCanvasDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (isReadOnly()) return;
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

    const handleLayerDragStart = (_e: React.DragEvent, index: number) => {
        setDraggedLayerIndex(index);
    };

    const handleLayerDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (isReadOnly()) return;
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

    const updateBoard = async (updates: any) => {
        if (isReadOnly()) return;
        try {
            const res = await api.put(`/api/boards/${id}`, updates);
            if (res.data.title) setBoardTitle(res.data.title);
            if (res.data.visibility) setVisibility(res.data.visibility);
            if (res.data.editors || res.data.viewers) {
                const editors = (res.data.editors || []).map((u: any) => ({ user: u, role: 'editor' }));
                const viewers = (res.data.viewers || []).map((u: any) => ({ user: u, role: 'viewer' }));
                setCollaborators([...editors, ...viewers]);
            }
        } catch (err) {
            console.error("Failed to update board", err);
        }
    };

    const insertIcon = (iconName: string, iconSvg: string) => {
        if (isReadOnly()) return;
        const svgBlob = new Blob([iconSvg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const centerX = canvasRect ? (canvasRect.width / 2 - panOffset.x) / zoom : 400;
        const centerY = canvasRect ? (canvasRect.height / 2 - panOffset.y) / zoom : 300;
        const newElement: Element = {
            id: Date.now().toString(),
            type: 'image',
            x: centerX - 50,
            y: centerY - 50,
            w: 100,
            h: 100,
            imageUrl: url,
            color: currentColor,
            text: iconName,
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
        emitElements(newElements);
        setSelectedElements([newElement.id]);
    };

    const handleInvite = async () => {
        if (!inviteEmail) return;

        // Optimistic update not easily possible without user details, so we wait for response
        // or we could add a temporary placeholder if we wanted.

        try {
            const res = await api.post(`/api/boards/${id}/collaborators`, { email: inviteEmail, role: inviteRole });

            // Sync with server response
            const editors = (res.data.editors || []).map((u: any) => ({ user: u, role: 'editor' }));
            const viewers = (res.data.viewers || []).map((u: any) => ({ user: u, role: 'viewer' }));
            setCollaborators([...editors, ...viewers]);

            setInviteEmail('');
        } catch (err: any) {
            console.error("Invite failed", err);
            alert(err.response?.data || "Failed to invite user");
        }
    };

    const handlersRef = useRef({
        undo, redo, paste, setTool, setSelectedElements,
        copySelected, cutSelected, deleteSelected, handleImageUpload,
        setArrowStart, elements, history, historyIndex,
        setShowLayers, isReadOnly
    });

    handlersRef.current = {
        undo, redo, paste, setTool, setSelectedElements,
        copySelected, cutSelected, deleteSelected, handleImageUpload,
        setArrowStart, elements, history, historyIndex,
        setShowLayers, isReadOnly
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const {
                undo, redo, paste, setTool, setSelectedElements,
                copySelected, cutSelected, deleteSelected, handleImageUpload,
                setArrowStart, elements, setShowLayers, isReadOnly
            } = handlersRef.current;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (isReadOnly()) return;
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                if (isReadOnly()) return;
                e.preventDefault();
                redo();
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'v':
                    if (e.ctrlKey || e.metaKey) {
                        if (isReadOnly()) return;
                        e.preventDefault();
                        paste();
                    } else {
                        setTool('select');
                    }
                    break;
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        copySelected();
                    }
                    break;
                case 'r':
                    if (!isReadOnly()) setTool('rect');
                    break;
                case 'o':
                    if (!isReadOnly()) setTool('circle');
                    break;
                case 't':
                    if (!isReadOnly()) setTool('text');
                    break;
                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        setSelectedElements(elements.map(el => el.id));
                    } else {
                        if (!isReadOnly()) setTool('arrow');
                    }
                    break;
                case 'l':
                    if (!isReadOnly()) setTool('line');
                    break;
                case 'f':
                    if (!isReadOnly()) setTool('frame');
                    break;
                case 'i':
                    if (!isReadOnly()) handleImageUpload();
                    break;
                case 'x':
                    if (e.ctrlKey || e.metaKey) {
                        if (isReadOnly()) return;
                        e.preventDefault();
                        cutSelected();
                    } else {
                        setShowLayers((prev: boolean) => !prev);
                    }
                    break;
                case 'delete':
                case 'backspace':
                    if (isReadOnly()) return;
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
    }, []);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card z-20">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 hover:bg-secondary rounded-full">
                        <ArrowLeft size={20} />
                    </Link>
                    <input
                        value={boardTitle}
                        onChange={(e) => updateBoard({ title: e.target.value })}
                        disabled={isReadOnly()}
                        className={`bg-transparent font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 ${isReadOnly() ? 'cursor-default opacity-80' : 'hover:bg-secondary/50'}`}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 mr-4">
                        {collaborators.map((c, i) => (
                            c.user && (
                                <div key={i} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs border-2 border-background" title={c.user.username || 'Unknown'}>
                                    {c.user.username?.[0]?.toUpperCase() || '?'}
                                </div>
                            )
                        ))}
                        {user && !collaborators.some(c => (c.user?._id || c.user) === user._id) && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs border-2 border-background" title={user.username + " (You)"}>
                                {user.username[0].toUpperCase()}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                        <Share2 size={16} />
                        <span className="text-sm font-medium">Share</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                            className="p-2 hover:bg-secondary rounded"
                        >
                            <Menu size={20} />
                        </button>

                        {showMenuDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                <button className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2">
                                    <User size={16} /> Profile
                                </button>
                                <Link to="/dashboard" className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2">
                                    <LayoutDashboard size={16} /> Dashboard
                                </Link>
                                <div className="h-px bg-border my-1" />
                                <button onClick={() => {
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-destructive flex items-center gap-2">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

// Enhanced toolbar with keyboard shortcuts and icons panel
// Copy this code to replace the toolbar section in Board.tsx (around line 1511-1569)

{/* Toolbar */}
{!isReadOnly() && (
    <div className="absolute top-20 left-4 flex flex-col gap-2 bg-card border border-border p-2 rounded-lg shadow-lg z-20">
        {/* Select Tool */}
        <button
            onClick={() => setTool('select')}
            className={`p-2 rounded relative group flex flex-col items-center gap-1 ${tool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
            <MousePointer2 size={20} />
            <span className="text-[9px] opacity-70">V</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Select (V)</span>
        </button>

        {/* Shape Tool with Submenu */}
        <div className="relative group">
            <button
                className={`p-2 rounded flex flex-col items-center gap-1 ${['rect', 'circle', 'triangle', 'diamond', 'hexagon', 'star'].includes(tool) ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
                {tool === 'circle' ? <Circle size={20} /> :
                    tool === 'triangle' ? <Triangle size={20} /> :
                        tool === 'diamond' ? <Diamond size={20} /> :
                            tool === 'hexagon' ? <Hexagon size={20} /> :
                                tool === 'star' ? <Star size={20} /> :
                                    <Square size={20} />}
                <span className="text-[9px] opacity-70">R</span>
            </button>
            <div className="absolute left-full top-0 ml-2 bg-card border border-border rounded-lg shadow-lg p-2 grid grid-cols-2 gap-2 w-32 hidden group-hover:grid z-50">
                <button onClick={() => setTool('rect')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'rect' ? 'bg-primary/20 text-primary' : ''}`} title="Rectangle"><Square size={20} /></button>
                <button onClick={() => setTool('circle')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'circle' ? 'bg-primary/20 text-primary' : ''}`} title="Circle"><Circle size={20} /></button>
                <button onClick={() => setTool('triangle')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'triangle' ? 'bg-primary/20 text-primary' : ''}`} title="Triangle"><Triangle size={20} /></button>
                <button onClick={() => setTool('diamond')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'diamond' ? 'bg-primary/20 text-primary' : ''}`} title="Diamond"><Diamond size={20} /></button>
                <button onClick={() => setTool('hexagon')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'hexagon' ? 'bg-primary/20 text-primary' : ''}`} title="Hexagon"><Hexagon size={20} /></button>
                <button onClick={() => setTool('star')} className={`p-2 rounded hover:bg-secondary flex justify-center ${tool === 'star' ? 'bg-primary/20 text-primary' : ''}`} title="Star"><Star size={20} /></button>
            </div>
        </div>

        {/* Arrow Tool */}
        <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded relative group flex flex-col items-center gap-1 ${tool === 'arrow' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
            <ArrowRight size={20} />
            <span className="text-[9px] opacity-70">A</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Arrow (A)</span>
        </button>

        {/* Line Tool */}
        <button
            onClick={() => setTool('line')}
            className={`p-2 rounded relative group flex flex-col items-center gap-1 ${tool === 'line' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
            <Minus size={20} className="rotate-45" />
            <span className="text-[9px] opacity-70">L</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Line (L)</span>
        </button>

        {/* Text Tool */}
        <button
            onClick={() => setTool('text')}
            className={`p-2 rounded relative group flex flex-col items-center gap-1 ${tool === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
        >
            <Type size={20} />
            <span className="text-[9px] opacity-70">T</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Text (T)</span>
        </button>

        {/* Image Tool */}
        <button
            onClick={handleImageUpload}
            className={`p-2 rounded relative group flex flex-col items-center gap-1 hover:bg-secondary text-muted-foreground hover:text-foreground`}
        >
            <Image size={20} />
            <span className="text-[9px] opacity-70">I</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Image (I)</span>
        </button>

        {/* Divider */}
        <div className="h-px bg-border my-1" />

        {/* Icons Panel */}
        <div className="relative group">
            <button
                className="p-2 rounded flex flex-col items-center gap-1 hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span className="text-[9px] opacity-70">⌘K</span>
            </button>
            
            {/* Icons Submenu */}
            <div className="absolute left-full top-0 ml-2 bg-card border border-border rounded-lg shadow-lg p-3 w-80 max-h-[500px] hidden group-hover:flex flex-col z-50">
                <div className="mb-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search icons..."
                            className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
                
                <div className="text-xs font-semibold text-muted-foreground mb-2">Brand Icons</div>
                
                <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1">
                    {[
                        { name: 'GitHub', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' },
                        { name: 'Twitter', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>' },
                        { name: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
                        { name: 'LinkedIn', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
                        { name: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>' },
                        { name: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
                        { name: 'Slack', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>' },
                        { name: 'Discord', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>' },
                    ].map((icon, idx) => (
                        <button
                            key={idx}
                            onClick={() => insertIcon(icon.name, icon.svg)}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-secondary group/icon"
                            title={icon.name}
                        >
                            <div className="w-8 h-8 flex items-center justify-center text-foreground" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                            <span className="text-[9px] text-muted-foreground group-hover/icon:text-foreground truncate w-full text-center">{icon.name}</span>
                        </button>
                    ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-border text-center text-xs text-muted-foreground">
                    Click to insert • Drag to position
                </div>
            </div>
        </div>
    </div>
)}


            <div className="flex-1 relative overflow-hidden">
                <div className="absolute top-4 right-6 flex gap-2 z-10">
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
                    <div className="absolute top-16 right-4 w-64 bg-card border border-border rounded-lg shadow-lg flex flex-col max-h-[calc(100%-5rem)] z-20">
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
                        <button
                            onClick={cutSelected}
                            disabled={!contextMenu.elementId}
                            className={`flex items-center gap-2 p-2 rounded text-xs text-left ${!contextMenu.elementId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'}`}
                        >
                            <Scissors size={14} /> <span>Cut</span> <span className="ml-auto text-muted-foreground">Ctrl X</span>
                        </button>
                        <button
                            onClick={copySelected}
                            disabled={!contextMenu.elementId}
                            className={`flex items-center gap-2 p-2 rounded text-xs text-left ${!contextMenu.elementId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'}`}
                        >
                            <Copy size={14} /> <span>Copy</span> <span className="ml-auto text-muted-foreground">Ctrl C</span>
                        </button>
                        <button onClick={paste} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <Clipboard size={14} /> <span>Paste</span> <span className="ml-auto text-muted-foreground">Ctrl V</span>
                        </button>
                        <button
                            onClick={() => { copySelected(); paste(); }}
                            disabled={!contextMenu.elementId}
                            className={`flex items-center gap-2 p-2 rounded text-xs text-left ${!contextMenu.elementId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'}`}
                        >
                            <Copy size={14} /> <span>Duplicate</span> <span className="ml-auto text-muted-foreground">Ctrl D</span>
                        </button>
                        <button onClick={() => setSelectedElements(elements.map(e => e.id))} className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left">
                            <MousePointer2 size={14} /> <span>Select all</span> <span className="ml-auto text-muted-foreground">Ctrl A</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        <button className="flex items-center gap-2 p-2 hover:bg-secondary rounded text-xs text-left opacity-50 cursor-not-allowed">
                            <Download size={14} /> <span>Export selection</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        <div className="relative group/order">
                            <button
                                disabled={!contextMenu.elementId}
                                className={`w-full flex items-center gap-2 p-2 rounded text-xs text-left ${!contextMenu.elementId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary'}`}
                            >
                                <BringToFront size={14} /> <span>Change Order</span> <ArrowRight size={12} className="ml-auto" />
                            </button>
                            {contextMenu.elementId && (
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
                            )}
                        </div>

                        <div className="h-px bg-border my-1" />

                        <button
                            onClick={deleteSelected}
                            disabled={!contextMenu.elementId}
                            className={`flex items-center gap-2 p-2 rounded text-xs text-left ${!contextMenu.elementId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-500/10 text-red-500'}`}
                        >
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
                        {(elements.find(el => el.id === selectedElements[0])?.type === 'rect' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'circle' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'triangle' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'diamond' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'hexagon' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'star') && (
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
                        {(elements.find(el => el.id === selectedElements[0])?.type === 'rect' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'circle' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'triangle' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'diamond' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'hexagon' ||
                            elements.find(el => el.id === selectedElements[0])?.type === 'star') && (
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
                                        <button
                                            onClick={() => changeShape('triangle')}
                                            className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'triangle' ? 'bg-primary text-primary-foreground' : ''}`}
                                            title="Triangle"
                                        >
                                            <Triangle size={16} />
                                        </button>
                                        <button
                                            onClick={() => changeShape('diamond')}
                                            className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'diamond' ? 'bg-primary text-primary-foreground' : ''}`}
                                            title="Diamond"
                                        >
                                            <Diamond size={16} />
                                        </button>
                                        <button
                                            onClick={() => changeShape('hexagon')}
                                            className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'hexagon' ? 'bg-primary text-primary-foreground' : ''}`}
                                            title="Hexagon"
                                        >
                                            <Hexagon size={16} />
                                        </button>
                                        <button
                                            onClick={() => changeShape('star')}
                                            className={`p-1.5 rounded hover:bg-secondary ${elements.find(el => el.id === selectedElements[0])?.type === 'star' ? 'bg-primary text-primary-foreground' : ''}`}
                                            title="Star"
                                        >
                                            <Star size={16} />
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

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg shadow-lg p-6 w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Share Board</h2>
                            <button onClick={() => setShowShareModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Visibility</label>
                            <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                                <button
                                    onClick={() => updateBoard({ visibility: 'private' })}
                                    className={`flex-1 py-1 px-2 rounded text-sm ${visibility === 'private' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Lock size={14} className="inline mr-1" /> Private
                                </button>
                                <button
                                    onClick={() => updateBoard({ visibility: 'public-view' })}
                                    className={`flex-1 py-1 px-2 rounded text-sm ${visibility === 'public-view' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Globe size={14} className="inline mr-1" /> Public View
                                </button>
                                <button
                                    onClick={() => updateBoard({ visibility: 'public-edit' })}
                                    className={`flex-1 py-1 px-2 rounded text-sm ${visibility === 'public-edit' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Globe size={14} className="inline mr-1" /> Public Edit
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Invite Collaborator</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                                    className="bg-background border border-border rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button
                                    onClick={handleInvite}
                                    className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:bg-primary/90"
                                >
                                    Invite
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Collaborators</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {collaborators.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 bg-secondary/50 rounded relative">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs">
                                                {c.user.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <span className="text-sm">{c.user.username || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground capitalize">{c.role}</span>
                                            {ownerId === user?._id && (c.user?._id || c.user) !== user?._id && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActiveCollaboratorMenu(activeCollaboratorMenu === (c.user?._id || c.user) ? null : (c.user?._id || c.user))}
                                                        className="p-1 hover:bg-secondary rounded"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                    {activeCollaboratorMenu === (c.user?._id || c.user) && (
                                                        <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded shadow-lg py-1 z-50">
                                                            <button
                                                                onClick={() => handleUpdateCollaboratorRole(c.user?._id || c.user, c.role === 'viewer' ? 'editor' : 'viewer')}
                                                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary"
                                                            >
                                                                Make {c.role === 'viewer' ? 'Editor' : 'Viewer'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveCollaborator(c.user?._id || c.user)}
                                                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary text-destructive"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {collaborators.length === 0 && (
                                    <div className="text-sm text-muted-foreground text-center py-2">No collaborators yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};
export default Board;

