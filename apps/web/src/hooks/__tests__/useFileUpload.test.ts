import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.uploadFile).toBe('function');
  });

  it('should upload an image file and return placeholder URL', async () => {
    const { result } = renderHook(() => useFileUpload());

    const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    let uploadPromise: Promise<string>;

    await act(async () => {
      uploadPromise = result.current.uploadFile(imageFile);
    });

    // Should be uploading
    expect(result.current.isUploading).toBe(true);

    // Fast-forward timers to complete the upload
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    const url = await uploadPromise!;

    expect(url).toContain('via.placeholder.com');
    expect(url).toContain('test.jpg');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(null);
  });

  it('should upload a non-image file and return appropriate placeholder', async () => {
    const { result } = renderHook(() => useFileUpload());

    const textFile = new File(['test'], 'document.pdf', {
      type: 'application/pdf',
    });

    vi.useRealTimers(); // Use real timers for this test

    const url = await result.current.uploadFile(textFile);

    expect(url).toContain('via.placeholder.com');
    expect(url).toContain('document.pdf');

    vi.useFakeTimers(); // Go back to fake timers
  });

  it('should generate different URLs for different file types', async () => {
    const { result } = renderHook(() => useFileUpload());

    vi.useRealTimers(); // Use real timers for this test

    const imageFile = new File(['test'], 'image.png', { type: 'image/png' });
    const textFile = new File(['test'], 'document.txt', { type: 'text/plain' });

    const imageUrl = await result.current.uploadFile(imageFile);
    const textUrl = await result.current.uploadFile(textFile);

    expect(imageUrl).toContain('600x400');
    expect(textUrl).toContain('300x200');

    vi.useFakeTimers(); // Go back to fake timers
  });
});
