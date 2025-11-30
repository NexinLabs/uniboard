# Advanced Whiteboard Features - Implementation Plan

## 🎯 New Features to Implement

### 1. **Double-Click to Add Text Inside Elements** ✏️
- Double-click on rectangle/circle opens text input
- Text is stored as property of the element
- Text is rendered centered inside the shape
- Font size auto-adjusts to fit

### 2. **Resizable Elements** 🔲
- Show 8 resize handles when element is selected:
  - 4 corners (nw, ne, se, sw)
  - 4 edges (n, e, s, w)
- Drag handles to resize
- Maintain aspect ratio with Shift key
- Update connected arrows during resize

### 3. **Customizable Arrows** 🎨
- Arrow types:
  - Straight (current)
  - Elbow (90° bends)
  - Curved (bezier curves)
- Arrow styles:
  - Line style: solid, dashed, dotted
  - Line width: thin, normal, thick
  - Arrow heads: none, single, double
  - Colors: customizable

### 4. **Arrow Context Menu** 📋
- Right-click on arrow shows menu:
  - Line Style (solid/dashed/dotted)
  - Line Width (1-5px)
  - Arrow Type (straight/elbow/curved)
  - Arrow Head (none/start/end/both)
  - Color picker
  - Delete arrow

## 📋 Implementation Steps

### Phase 1: Text Inside Elements (30 min)
1. Add `text` property to Element interface
2. Add double-click handler
3. Show inline text input overlay
4. Render text centered in shapes
5. Sync via Socket.IO

### Phase 2: Resizable Elements (45 min)
1. Add resize handles to selected elements
2. Implement drag-to-resize logic
3. Update element dimensions
4. Update connected arrow positions
5. Sync via Socket.IO

### Phase 3: Customizable Arrows (60 min)
1. Extend Arrow interface with style properties
2. Implement elbow arrow path calculation
3. Implement curved arrow (bezier)
4. Add arrow rendering with different styles
5. Sync via Socket.IO

### Phase 4: Arrow Context Menu (30 min)
1. Add right-click detection on arrows
2. Create context menu component
3. Add style options
4. Update arrow properties
5. Sync via Socket.IO

## 🔧 Technical Details

### Element Interface Updates
```typescript
interface Element {
    // ... existing properties
    text?: string;           // NEW: Text inside element
    fontSize?: number;       // NEW: Font size
    textAlign?: 'center' | 'left' | 'right'; // NEW
}

interface ArrowElement extends Element {
    type: 'arrow';
    arrowType: 'straight' | 'elbow' | 'curved'; // NEW
    lineStyle: 'solid' | 'dashed' | 'dotted';   // NEW
    lineWidth: number;                           // NEW
    arrowHead: 'none' | 'start' | 'end' | 'both'; // NEW
}
```

### Resize Handles
```typescript
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const getResizeHandles = (element: Element) => {
    // Returns 8 handle positions
    return [
        { type: 'nw', x: el.x, y: el.y },
        { type: 'n', x: el.x + w/2, y: el.y },
        // ... 6 more handles
    ];
};
```

### Elbow Arrow Calculation
```typescript
const calculateElbowPath = (from: Point, to: Point) => {
    const midX = (from.x + to.x) / 2;
    return [
        from,
        { x: midX, y: from.y },  // Horizontal
        { x: midX, y: to.y },    // Vertical
        to
    ];
};
```

## 🎨 UI Components Needed

1. **Text Input Overlay**
   - Positioned over element
   - Auto-focus on show
   - Save on Enter/blur

2. **Resize Handles**
   - 8 small squares/circles
   - Different cursors (nw-resize, n-resize, etc.)
   - Highlight on hover

3. **Context Menu**
   - Positioned at mouse click
   - Styled dropdown
   - Close on outside click

## 🚀 Let's Start!

I'll implement these features one by one. Which would you like first?

1. **Text inside elements** (quickest, most useful)
2. **Resizable elements** (very useful for layout)
3. **Customizable arrows** (advanced, looks professional)
4. **Arrow context menu** (complements #3)

Or should I implement all of them in order?
