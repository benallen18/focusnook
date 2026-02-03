import { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal } from 'lucide-react';

export default function DraggableWidget({ children, defaultPosition, defaultSize, widgetId, minWidth = 200, minHeight = 150, disableResize = false, zIndex = 10, onBringToFront }) {
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem(`chillspace-widget-pos-${widgetId}`);
        return saved ? JSON.parse(saved) : defaultPosition;
    });

    const [size, setSize] = useState(() => {
        const saved = localStorage.getItem(`chillspace-widget-size-${widgetId}`);
        return saved ? JSON.parse(saved) : defaultSize || null;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragRef = useRef(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const startSizeRef = useRef({ width: 0, height: 0 });
    const startPosRef = useRef({ x: 0, y: 0 });

    // Save position
    useEffect(() => {
        localStorage.setItem(`chillspace-widget-pos-${widgetId}`, JSON.stringify(position));
    }, [position, widgetId]);

    // Save size
    useEffect(() => {
        if (size) {
            localStorage.setItem(`chillspace-widget-size-${widgetId}`, JSON.stringify(size));
        }
    }, [size, widgetId]);

    const handleMouseDown = (e) => {
        // Bring widget to front when clicked anywhere
        if (onBringToFront) {
            onBringToFront(widgetId);
        }

        if (e.target.closest('.resize-handle')) {
            // Start resizing
            setIsResizing(true);
            const rect = dragRef.current.getBoundingClientRect();
            startSizeRef.current = { width: rect.width, height: rect.height };
            startPosRef.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            e.stopPropagation();
        } else if (e.target.closest('.drag-handle-zone')) {
            // Start dragging
            setIsDragging(true);
            const rect = dragRef.current.getBoundingClientRect();
            offsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            e.preventDefault();
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            const newX = e.clientX - offsetRef.current.x;
            const newY = e.clientY - offsetRef.current.y;

            const rect = dragRef.current.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height - 80;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }

        if (isResizing) {
            const deltaX = e.clientX - startPosRef.current.x;
            const deltaY = e.clientY - startPosRef.current.y;

            const newWidth = Math.max(minWidth, startSizeRef.current.width + deltaX);
            const newHeight = Math.max(minHeight, startSizeRef.current.height + deltaY);

            // Constrain to viewport
            const maxWidth = window.innerWidth - position.x - 20;
            const maxHeight = window.innerHeight - position.y - 100;

            setSize({
                width: Math.min(newWidth, maxWidth),
                height: Math.min(newHeight, maxHeight)
            });
        }
    }, [isDragging, isResizing, position, minWidth, minHeight]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    const isActive = isDragging || isResizing;

    return (
        <div
            ref={dragRef}
            className={`draggable-widget ${isActive ? 'active' : ''}`}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: size?.width || 'auto',
                height: size?.height || 'auto',
                zIndex: isActive ? zIndex + 100 : zIndex,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="drag-handle-zone">
                <GripHorizontal size={16} />
            </div>

            <div className="widget-content" style={size && !disableResize ? { width: '100%', height: '100%', overflow: 'hidden' } : { overflow: 'visible' }}>
                {children}
            </div>

            {/* Resize handle - only show if resize is enabled */}
            {!disableResize && (
                <div className="resize-handle">
                    <svg width="12" height="12" viewBox="0 0 12 12">
                        <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            <style>{`
        .draggable-widget {
          transition: ${isActive ? 'none' : 'box-shadow var(--transition-fast)'};
        }
        
        .draggable-widget.active {
          box-shadow: var(--shadow-lg);
        }
        
        .widget-content {
          display: flex;
          flex-direction: column;
        }
        
        .widget-content > div {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        
        .drag-handle-zone {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          padding: var(--space-2) var(--space-4);
          cursor: grab;
          color: var(--color-text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast);
          z-index: 10;
        }
        
        .draggable-widget:hover .drag-handle-zone {
          opacity: 1;
        }
        
        .draggable-widget.active .drag-handle-zone {
          opacity: 1;
          cursor: grabbing;
        }
        
        .resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 20px;
          cursor: se-resize;
          color: var(--color-text-muted);
          opacity: 0;
          transition: opacity var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        
        .draggable-widget:hover .resize-handle {
          opacity: 0.6;
        }
        
        .resize-handle:hover {
          opacity: 1 !important;
          color: var(--color-accent);
        }
      `}</style>
        </div>
    );
}
