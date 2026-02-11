import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { GripHorizontal } from 'lucide-react';

const BOTTOM_DOCK_OFFSET = 80;
const VIEWPORT_PADDING = 20;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getClientCoords = (event) => {
  if (event.touches && event.touches.length > 0) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }
  return { x: event.clientX, y: event.clientY };
};

export default function DraggableWidget({
  children,
  defaultPosition,
  defaultSize,
  widgetId,
  position,
  size,
  minWidth = 200,
  minHeight = 150,
  disableResize = false,
  allowOverflow = false,
  zIndex = 10,
  onBringToFront,
  onLayoutChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position || defaultPosition || { x: 0, y: 0 });
  const sizeRef = useRef(size || defaultSize || null);

  useEffect(() => {
    positionRef.current = position || defaultPosition || { x: 0, y: 0 };
  }, [position, defaultPosition]);

  useEffect(() => {
    sizeRef.current = size || defaultSize || null;
  }, [size, defaultSize]);

  const emitLayoutChange = useCallback((nextPosition, nextSize) => {
    if (!onLayoutChange) return;
    onLayoutChange({
      widgetId,
      position: nextPosition,
      size: nextSize,
    });
  }, [onLayoutChange, widgetId]);

  const resolvedPosition = useMemo(() => (position || defaultPosition || { x: 0, y: 0 }), [position, defaultPosition]);
  const resolvedSize = useMemo(() => (size || defaultSize || null), [size, defaultSize]);

  const handleInteractionStart = (event) => {
    if (onBringToFront) {
      onBringToFront(widgetId);
    }

    const { x, y } = getClientCoords(event);

    if (event.target.closest('.resize-handle')) {
      setIsResizing(true);
      const rect = dragRef.current.getBoundingClientRect();
      startSizeRef.current = { width: rect.width, height: rect.height };
      startPosRef.current = { x, y };
      // Prevent default to stop scrolling/selection on touch
      if (event.cancelable && event.type.startsWith('touch')) {
        event.preventDefault();
      }
      event.stopPropagation();
      return;
    }

    if (event.target.closest('.drag-handle-zone')) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: x - rect.left,
        y: y - rect.top,
      };
      // Prevent default to stop scrolling/selection on touch
      if (event.cancelable && event.type.startsWith('touch')) {
        event.preventDefault();
      }
    }
  };

  const handleInteractionMove = useCallback((event) => {
    const { x, y } = getClientCoords(event);

    if (isDragging) {
      if (event.cancelable && event.type.startsWith('touch')) {
        event.preventDefault();
      }

      const currentSize = sizeRef.current;
      const widgetWidth = currentSize?.width || dragRef.current?.offsetWidth || 0;
      const widgetHeight = currentSize?.height || dragRef.current?.offsetHeight || 0;
      const maxX = Math.max(0, window.innerWidth - widgetWidth);
      const maxY = Math.max(0, window.innerHeight - widgetHeight - BOTTOM_DOCK_OFFSET);

      const nextPosition = {
        x: clamp(x - offsetRef.current.x, 0, maxX),
        y: clamp(y - offsetRef.current.y, 0, maxY),
      };

      positionRef.current = nextPosition;
      emitLayoutChange(nextPosition, currentSize);
    }

    if (isResizing && !disableResize) {
      if (event.cancelable && event.type.startsWith('touch')) {
        event.preventDefault();
      }

      const deltaX = x - startPosRef.current.x;
      const deltaY = y - startPosRef.current.y;

      const nextSize = {
        width: Math.max(minWidth, startSizeRef.current.width + deltaX),
        height: Math.max(minHeight, startSizeRef.current.height + deltaY),
      };

      const currentPosition = positionRef.current || { x: 0, y: 0 };
      const maxWidth = Math.max(minWidth, window.innerWidth - currentPosition.x - VIEWPORT_PADDING);
      const maxHeight = Math.max(minHeight, window.innerHeight - currentPosition.y - BOTTOM_DOCK_OFFSET - VIEWPORT_PADDING);

      const clampedSize = {
        width: Math.min(nextSize.width, maxWidth),
        height: Math.min(nextSize.height, maxHeight),
      };

      sizeRef.current = clampedSize;
      emitLayoutChange(currentPosition, clampedSize);
    }
  }, [disableResize, emitLayoutChange, isDragging, isResizing, minHeight, minWidth]);

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const clampWithinViewport = useCallback(() => {
    const element = dragRef.current;
    const currentPosition = positionRef.current || defaultPosition || { x: 0, y: 0 };
    const currentSize = sizeRef.current;

    let nextSize = currentSize;
    if (currentSize) {
      const minAllowedWidth = Math.max(120, minWidth);
      const minAllowedHeight = Math.max(120, minHeight);
      const maxWidth = Math.max(minAllowedWidth, window.innerWidth - VIEWPORT_PADDING);
      const maxHeight = Math.max(minAllowedHeight, window.innerHeight - BOTTOM_DOCK_OFFSET - VIEWPORT_PADDING);

      nextSize = {
        width: Math.min(Math.max(toNumber(currentSize.width, minAllowedWidth), minAllowedWidth), maxWidth),
        height: Math.min(Math.max(toNumber(currentSize.height, minAllowedHeight), minAllowedHeight), maxHeight),
      };
    }

    const width = nextSize?.width || element?.offsetWidth || 0;
    const height = nextSize?.height || element?.offsetHeight || 0;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height - BOTTOM_DOCK_OFFSET);

    const nextPosition = {
      x: clamp(toNumber(currentPosition.x), 0, maxX),
      y: clamp(toNumber(currentPosition.y), 0, maxY),
    };

    const sizeChanged = !!nextSize && (
      !currentSize
      || nextSize.width !== currentSize.width
      || nextSize.height !== currentSize.height
    );
    const positionChanged = nextPosition.x !== currentPosition.x || nextPosition.y !== currentPosition.y;

    if (sizeChanged || positionChanged) {
      positionRef.current = nextPosition;
      sizeRef.current = nextSize;
      emitLayoutChange(nextPosition, nextSize);
    }
  }, [defaultPosition, disableResize, emitLayoutChange, minHeight, minWidth]);

  useEffect(() => {
    if (!isDragging && !isResizing) return undefined;

    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('touchmove', handleInteractionMove, { passive: false });
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);
    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleInteractionMove, handleInteractionEnd, isDragging, isResizing]);

  useEffect(() => {
    const handleResize = () => clampWithinViewport();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const rafId = window.requestAnimationFrame(clampWithinViewport);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.cancelAnimationFrame(rafId);
    };
  }, [clampWithinViewport]);

  const isActive = isDragging || isResizing;
  const hasSize = Boolean(resolvedSize?.width && resolvedSize?.height);

  return (
    <div
      ref={dragRef}
      className={`draggable-widget ${isActive ? 'active' : ''}`}
      style={{
        position: 'fixed',
        left: resolvedPosition.x,
        top: resolvedPosition.y,
        width: hasSize ? resolvedSize.width : 'auto',
        height: hasSize ? resolvedSize.height : 'auto',
        zIndex: isActive ? zIndex + 100 : zIndex,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
    >
      <div className="drag-handle-zone">
        <GripHorizontal size={16} />
      </div>

      <div
        className="widget-content"
        style={hasSize
          ? {
            width: '100%',
            height: '100%',
            overflow: allowOverflow ? 'visible' : 'hidden',
          }
          : { overflow: 'visible' }}
      >
        {children}
      </div>

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
          box-sizing: border-box;
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
