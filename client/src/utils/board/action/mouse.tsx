






export default class Mouse {
    
    
        // const handleMouseMove = (e: React.MouseEvent) => {
        //     const { x, y } = getCanvasCoords(e);
    
        //     if (isDrawing && arrowHandle && selectedElements.length === 1) {
        //         const el = elements.find(e => e.id === selectedElements[0]);
        //         if (el && el.type === 'arrow') {
        //             const newElements = elements.map(e => {
        //                 if (e.id === el.id) {
        //                     if (arrowHandle.type === 'control') {
        //                         return { ...e, controlPoint: { x, y } };
        //                     } else if (arrowHandle.type === 'start') {
        //                         const connection = getConnectionPointAtPosition(x, y, elements);
        //                         if (connection) {
        //                             return { ...e, startPoint: undefined, fromId: connection.element.id, fromPoint: connection.point };
        //                         } else {
        //                             return { ...e, startPoint: { x, y }, fromId: undefined, fromPoint: undefined };
        //                         }
        //                     } else if (arrowHandle.type === 'end') {
        //                         const connection = getConnectionPointAtPosition(x, y, elements);
        //                         if (connection) {
        //                             return { ...e, endPoint: undefined, toId: connection.element.id, toPoint: connection.point };
        //                         } else {
        //                             return { ...e, endPoint: { x, y }, toId: undefined, toPoint: undefined };
        //                         }
        //                     }
        //                 }
        //                 return e;
        //             });
        //             setElements(newElements);
        //             return;
        //         }
        //     }
    
        //     if (isDrawing && resizeHandle && selectedElements.length === 1) {
        //         const el = elements.find(e => e.id === selectedElements[0]);
        //         if (el) {
        //             let newX = el.x;
        //             let newY = el.y;
        //             let newW = el.w || 0;
        //             let newH = el.h || 0;
        //             let newRadius = el.radius || 0;
    
        //             if (el.type === 'rect' || el.type === 'image') {
        //                 if (resizeHandle.includes('e')) newW = x - el.x;
        //                 if (resizeHandle.includes('s')) newH = y - el.y;
        //                 if (resizeHandle.includes('w')) {
        //                     const right = el.x + (el.w || 0);
        //                     newX = x;
        //                     newW = right - x;
        //                 }
        //                 if (resizeHandle.includes('n')) {
        //                     const bottom = el.y + (el.h || 0);
        //                     newY = y;
        //                     newH = bottom - y;
        //                 }
    
        //                 if (newW < 10) newW = 10;
        //                 if (newH < 10) newH = 10;
        //             } else if (el.type === 'circle') {
        //                 const centerX = el.x;
        //                 const centerY = el.y;
        //                 const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        //                 newRadius = dist;
        //                 if (newRadius < 5) newRadius = 5;
        //             }
    
        //             const newElements = elements.map(e => {
        //                 if (e.id === el.id) {
        //                     return { ...e, x: newX, y: newY, w: newW, h: newH, radius: newRadius };
        //                 }
        //                 return e;
        //             });
        //             setElements(newElements);
        //             return;
        //         }
        //     }
    
        //     if (!isDrawing && selectedElements.length === 1) {
        //         const el = elements.find(e => e.id === selectedElements[0]);
        //         if (el) {
        //             const handles = getResizeHandles(el);
        //             const hoveredHandle = handles.find(h => {
        //                 return x >= h.x - 5 && x <= h.x + 5 && y >= h.y - 5 && y <= h.y + 5;
        //             });
        //             if (hoveredHandle && canvasRef.current) {
        //                 canvasRef.current.style.cursor = getCursorForHandle(hoveredHandle.type);
        //             } else if (canvasRef.current && tool === 'select') {
        //                 canvasRef.current.style.cursor = 'default';
        //             }
        //         }
        //     }
    
        //     if (tool === 'arrow' || tool === 'line') {
        //         const connection = getConnectionPointAtPosition(x, y, elements);
        //         if (connection) {
        //             setHoveredConnectionPoint({ elementId: connection.element.id, point: connection.point });
        //         } else {
        //             setHoveredConnectionPoint(null);
        //         }
        //     }
    
        //     if (isPanning && startPos) {
        //         setPanOffset({
        //             x: e.clientX - startPos.x,
        //             y: e.clientY - startPos.y
        //         });
        //         return;
        //     }
    
        //     if (!isDrawing) {
        //         if ((tool === 'arrow' || tool === 'line') && arrowStart) {
        //             setCurrentPos({ x, y });
        //         }
        //         return;
        //     }
    
        //     if (selectionBox) {
        //         setSelectionBox({ ...selectionBox, current: { x, y } });
        //         return;
        //     }
    
        //     if (tool === 'select' && selectedElements.length > 0 && dragOffset) {
        //         const firstSelected = elements.find(el => el.id === selectedElements[0]);
        //         if (!firstSelected) return;
    
        //         const dx = x - firstSelected.x - dragOffset.x;
        //         const dy = y - firstSelected.y - dragOffset.y;
    
        //         const newElements = elements.map(el => {
        //             if (selectedElements.includes(el.id)) {
        //                 return { ...el, x: el.x + dx, y: el.y + dy };
        //             }
        //             return el;
        //         });
        //         setElements(newElements);
    
        //         const newFirstSelected = newElements.find(el => el.id === selectedElements[0])!;
        //         setDragOffset({ x: x - newFirstSelected.x, y: y - newFirstSelected.y });
        //     } else {
        //         setCurrentPos({ x, y });
        //     }
        // };
    

}