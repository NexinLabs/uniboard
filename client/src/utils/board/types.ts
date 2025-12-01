// Type definitions for the Board component

export type Tool = 'select' | 'rect' | 'circle' | 'text' | 'arrow' | 'image' | 'line' | 'frame' | 'pan';

export interface ConnectionPoint {
    x: number;
    y: number;
    position: 'top' | 'right' | 'bottom' | 'left';
}

export interface Element {
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

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ArrowHandle {
    type: 'start' | 'end' | 'control';
    x: number;
    y: number;
}

export interface ResizeHandlePosition {
    type: ResizeHandle;
    x: number;
    y: number;
}

export interface Board {
    _id: string;
    name: string;
    owner: string;
    collaborators: Array<{ user: string; permission: 'view' | 'edit' }>;
    isPublic: boolean;
}

export interface Collaborator {
    user: {
        _id: string;
        username: string;
    };
    permission: 'view' | 'edit';
}
