// Socket.IO event handlers and utilities

import { Socket } from 'socket.io-client';
import type { Element } from './types';

/**
 * Emit element updates via Socket.IO
 */
export function emitElements(
    socket: Socket | null,
    boardId: string | undefined,
    elements: Element[]
): void {
    if (socket && boardId) {
        console.log('📤 Emitting elements via Socket.IO (server will save to DB)');
        socket.emit('element-update', {
            boardId,
            elements
        });
    } else {
        console.warn('⚠️ Socket not connected, changes not synced!');
    }
}

/**
 * Join a board room
 */
export function joinBoard(socket: Socket, boardId: string): void {
    socket.emit('join-board', boardId);
    console.log('Joined board room:', boardId);
}

/**
 * Leave a board room
 */
export function leaveBoard(socket: Socket, boardId: string | undefined): void {
    if (boardId) {
        socket.emit('leave-board', boardId);
        console.log('Left board room:', boardId);
    }
}

/**
 * Setup socket event listeners
 */
export function setupSocketListeners(
    socket: Socket,
    onElementsUpdated: (elements: Element[]) => void,
    onUserJoined?: (data: any) => void,
    onUserLeft?: (data: any) => void
): void {
    // Listen for updates from other users
    socket.on('elements-updated', (updatedElements: Element[]) => {
        console.log('📡 Received elements update from another user');
        onElementsUpdated(updatedElements);
    });

    // Listen for user join events
    if (onUserJoined) {
        socket.on('user-joined', (data: any) => {
            console.log('👋 User joined:', data.userId);
            onUserJoined(data);
        });
    }

    // Listen for user leave events
    if (onUserLeft) {
        socket.on('user-left', (data: any) => {
            console.log('👋 User left:', data.userId);
            onUserLeft(data);
        });
    }
}

/**
 * Cleanup socket listeners
 */
export function cleanupSocketListeners(socket: Socket): void {
    socket.off('elements-updated');
    socket.off('user-joined');
    socket.off('user-left');
}
