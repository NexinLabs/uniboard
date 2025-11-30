# Advanced Features Implementation - Code Snippets

Due to the large file size, here are the key code additions needed for Board.tsx:

## 1. Helper Functions for Resize Handles

```typescript
// Add after getConnectionPoints function
const getResizeHandles = (el: Element): {type: ResizeHandle, x: number, y: number}[] => {
    if (el.type !== 'rect' && el.type !== 'circle') return [];
    
    if (el.type === 'rect') {
        const w = el.w || 0;
        const h = el.h || 0;
        return [
            { type: 'nw', x: el.x, y: el.y },
            { type: 'n', x: el.x + w/2, y: el.y },
            { type: 'ne', x: el.x + w, y: el.y },
            { type: 'e', x: el.x + w, y: el.y + h/2 },
            { type: 'se', x: el.x + w, y: el.y + h },
            { type: 's', x: el.x + w/2, y: el.y + h },
            { type: 'sw', x: el.x, y: el.y + h },
            { type: 'w', x: el.x, y: el.y + h/2 },
        ];
    } else {
        const r = el.radius || 0;
        return [
            { type: 'n', x: el.x, y: el.y - r },
            { type: 'e', x: el.x + r, y: el.y },
            { type: 's', x: el.x, y: el.y + r },
            { type: 'w', x: el.x - r, y: el.y },
        ];
    }
};

const getResizeHandleAtPosition = (x: number, y: number, element: Element) => {
    const handles = getResizeHandles(element);
    for (const handle of handles) {
        const dist = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
        if (dist <= 6) return handle.type;
    }
    return null;
};
```

## 2. Elbow Arrow Path Calculation

```typescript
const calculateElbowPath = (fromPoint: ConnectionPoint, toPoint: ConnectionPoint) => {
    const from = fromPoint;
    const to = toPoint;
    
    // Simple elbow: horizontal then vertical
    const midX = (from.x + to.x) / 2;
    
    return {
        path: [
            { x: from.x, y: from.y },
            { x: midX, y: from.y },
            { x: midX, y: to.y },
            { x: to.x, y: to.y }
        ]
    };
};
```

## 3. Render Text Inside Shapes

```typescript
// In the canvas rendering useEffect, add this for rect/circle:
if (el.text && (el.type === 'rect' || el.type === 'circle')) {
    ctx.fillStyle = el.color || 'white';
    ctx.font = `${el.fontSize || 16}px Arial`;
    ctx.textAlign = el.textAlign || 'center';
    ctx.textBaseline = 'middle';
    
    if (el.type === 'rect') {
        const centerX = el.x + (el.w || 0) / 2;
        const centerY = el.y + (el.h || 0) / 2;
        ctx.fillText(el.text, centerX, centerY);
    } else if (el.type === 'circle') {
        ctx.fillText(el.text, el.x, el.y);
    }
}
```

## 4. Render Resize Handles

```typescript
// In canvas rendering, after drawing selected elements:
if (isSelected && (el.type === 'rect' || el.type === 'circle')) {
    const handles = getResizeHandles(el);
    handles.forEach(handle => {
        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });
}
```

## 5. Double-Click Handler

```typescript
const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const element = getElementAtPosition(x, y);
    
    if (element && (element.type === 'rect' || element.type === 'circle')) {
        setEditingElement(element.id);
        setEditingText(element.text || '');
    }
};

const saveElementText = () => {
    if (!editingElement) return;
    
    const newElements = elements.map(el => {
        if (el.id === editingElement) {
            return { ...el, text: editingText };
        }
        return el;
    });
    
    setElements(newElements);
    addToHistory(newElements);
    emitElements(newElements);
    setEditingElement(null);
    setEditingText('');
};
```

## 6. Context Menu for Arrows

```typescript
const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    
    // Check if clicked on arrow
    for (const el of elements) {
        if (el.type === 'arrow') {
            // Simple hit detection for arrow line
            const fromEl = elements.find(e => e.id === el.fromId);
            const toEl = elements.find(e => e.id === el.toId);
            if (fromEl && toEl) {
                const fromPoints = getConnectionPoints(fromEl);
                const toPoints = getConnectionPoints(toEl);
                const fromPoint = fromPoints.find(p => p.position === el.fromPoint?.position) || fromPoints[0];
                const toPoint = toPoints.find(p => p.position === el.toPoint?.position) || toPoints[0];
                
                // Check if click is near the line
                const dist = distanceToLine(x, y, fromPoint, toPoint);
                if (dist < 10) {
                    setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
                    return;
                }
            }
        }
    }
};

const updateArrowStyle = (property: string, value: any) => {
    if (!contextMenu) return;
    
    const newElements = elements.map(el => {
        if (el.id === contextMenu.elementId) {
            return { ...el, [property]: value };
        }
        return el;
    });
    
    setElements(newElements);
    addToHistory(newElements);
    emitElements(newElements);
};
```

## 7. JSX for Text Input Overlay

```tsx
{editingElement && (
    <div 
        style={{
            position: 'absolute',
            left: `${elements.find(el => el.id === editingElement)?.x}px`,
            top: `${elements.find(el => el.id === editingElement)?.y}px`,
            zIndex: 1000
        }}
    >
        <input
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={saveElementText}
            onKeyDown={(e) => {
                if (e.key === 'Enter') saveElementText();
                if (e.key === 'Escape') {
                    setEditingElement(null);
                    setEditingText('');
                }
            }}
            autoFocus
            className="px-2 py-1 border border-primary rounded bg-card text-foreground"
        />
    </div>
)}
```

## 8. JSX for Context Menu

```tsx
{contextMenu && (
    <div 
        style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000
        }}
        className="bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px]"
    >
        <div className="text-xs font-semibold mb-2 px-2">Arrow Style</div>
        
        <button 
            onClick={() => updateArrowStyle('arrowType', 'straight')}
            className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm"
        >
            Straight
        </button>
        <button 
            onClick={() => updateArrowStyle('arrowType', 'elbow')}
            className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm"
        >
            Elbow
        </button>
        
        <div className="h-px bg-border my-1" />
        
        <button 
            onClick={() => updateArrowStyle('lineStyle', 'solid')}
            className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm"
        >
            Solid Line
        </button>
        <button 
            onClick={() => updateArrowStyle('lineStyle', 'dashed')}
            className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm"
        >
            Dashed Line
        </button>
        
        <div className="h-px bg-border my-1" />
        
        <button 
            onClick={() => {
                const newElements = elements.filter(el => el.id !== contextMenu.elementId);
                setElements(newElements);
                emitElements(newElements);
                setContextMenu(null);
            }}
            className="w-full text-left px-2 py-1 hover:bg-destructive rounded text-sm text-destructive"
        >
            Delete Arrow
        </button>
    </div>
)}
```

## Implementation Notes

These snippets need to be integrated into the existing Board.tsx file. The key integration points are:

1. Add helper functions after existing utility functions
2. Update canvas rendering logic to include new features
3. Add event handlers (onDoubleClick, onContextMenu)
4. Add JSX overlays before closing div

Would you like me to create a complete updated Board.tsx file with all these features integrated?
