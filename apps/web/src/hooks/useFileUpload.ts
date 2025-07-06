import { useState } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<string>;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  error: string | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<string> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      // TODO: Implement actual file upload to R2
      // For now, simulate upload with a delay and return placeholder

      // Simulate upload progress
      const simulateProgress = () => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress({
            loaded: progress,
            total: 100,
            percentage: progress,
          });

          if (progress >= 100) {
            clearInterval(interval);
          }
        }, 100);
      };

      simulateProgress();

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return placeholder URL with file name
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      // Create a placeholder URL based on file type
      if (
        fileExtension &&
        ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)
      ) {
        return `https://via.placeholder.com/600x400/e2e8f0/64748b?text=${encodeURIComponent(fileName)}`;
      }

      return `https://via.placeholder.com/300x200/f1f5f9/64748b?text=${encodeURIComponent(fileName)}`;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    error,
  };
}
