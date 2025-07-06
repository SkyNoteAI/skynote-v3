import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizable } from '../useResizable';

describe('useResizable', () => {
  const defaultProps = {
    initialWidth: 256,
    minWidth: 200,
    maxWidth: 400,
    direction: 'right' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    expect(result.current.width).toBe(256);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.resizeRef).toBeDefined();
    expect(typeof result.current.startResize).toBe('function');
    expect(typeof result.current.resetWidth).toBe('function');
    expect(typeof result.current.handleDoubleClick).toBe('function');
  });

  it('resets width to initial value', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    // Change width first
    act(() => {
      result.current.resetWidth();
    });

    expect(result.current.width).toBe(256);
  });

  it('handles double click to toggle between current and min width', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    // First double click should go to min width
    act(() => {
      result.current.handleDoubleClick();
    });

    expect(result.current.width).toBe(200);

    // Second double click should go back to initial width
    act(() => {
      result.current.handleDoubleClick();
    });

    expect(result.current.width).toBe(256);
  });

  it('handles mouse resize events for right direction', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as React.MouseEvent;

    // Add event listeners spy
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    expect(mockMouseEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isResizing).toBe(true);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    );

    // Simulate mouseup to end resize
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mouseup',
      expect.any(Function)
    );
  });

  it('handles mouse resize events for left direction', () => {
    const leftProps = { ...defaultProps, direction: 'left' as const };
    const { result } = renderHook(() => useResizable(leftProps));

    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: 200,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    expect(result.current.isResizing).toBe(true);
  });

  it('respects min and max width constraints during resize', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    // Simulate mousemove beyond max width
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 800, // Far beyond max width
    });

    document.dispatchEvent(mouseMoveEvent);

    // Width should be clamped to max
    expect(result.current.width).toBeLessThanOrEqual(400);

    // Simulate mousemove below min width
    const mouseMoveEventMin = new MouseEvent('mousemove', {
      clientX: 50, // Far below min width
    });

    document.dispatchEvent(mouseMoveEventMin);

    // Width should be clamped to min
    expect(result.current.width).toBeGreaterThanOrEqual(200);
  });

  it('sets body cursor and user-select during resize', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // Simulate mouseup
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('stops resizing on mouseup', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: 300,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    expect(result.current.isResizing).toBe(true);

    // Simulate mouseup
    const mouseUpEvent = new MouseEvent('mouseup');
    document.dispatchEvent(mouseUpEvent);

    // Should update isResizing in the next render
    expect(result.current.isResizing).toBe(false);
  });

  it('calculates width correctly for right direction', () => {
    const { result } = renderHook(() => useResizable(defaultProps));

    const startX = 300;
    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: startX,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    // Simulate mousemove to the right (increase width)
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: startX + 50,
    });

    document.dispatchEvent(mouseMoveEvent);

    // Width should increase by the delta
    expect(result.current.width).toBe(306); // 256 + 50
  });

  it('calculates width correctly for left direction', () => {
    const leftProps = { ...defaultProps, direction: 'left' as const };
    const { result } = renderHook(() => useResizable(leftProps));

    const startX = 300;
    const mockMouseEvent = {
      preventDefault: vi.fn(),
      clientX: startX,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.startResize(mockMouseEvent);
    });

    // Simulate mousemove to the left (increase width for left direction)
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: startX - 50,
    });

    document.dispatchEvent(mouseMoveEvent);

    // Width should increase by the delta (inverted for left direction)
    expect(result.current.width).toBe(306); // 256 + 50
  });
});
