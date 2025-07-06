import { useState, useCallback, useRef } from 'react';

interface UseResizableProps {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  direction: 'left' | 'right';
}

export function useResizable({
  initialWidth,
  minWidth,
  maxWidth,
  direction,
}: UseResizableProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX =
          direction === 'left' ? startX - e.clientX : e.clientX - startX;
        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + deltaX)
        );
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width, minWidth, maxWidth, direction]
  );

  // Reset to initial width
  const resetWidth = useCallback(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  // Double-click to reset or toggle
  const handleDoubleClick = useCallback(() => {
    if (width === minWidth) {
      setWidth(initialWidth);
    } else {
      setWidth(minWidth);
    }
  }, [width, minWidth, initialWidth]);

  return {
    width,
    isResizing,
    resizeRef,
    startResize,
    resetWidth,
    handleDoubleClick,
  };
}
