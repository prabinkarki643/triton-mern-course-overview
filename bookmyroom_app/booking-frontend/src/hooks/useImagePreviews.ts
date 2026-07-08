// src/hooks/useImagePreviews.ts
// Matches Lesson 23 section 23.15. Wraps the URL.createObjectURL lifecycle
// so components never leak blob URLs when they unmount or the selection
// changes.
import { useEffect, useState } from "react";

const MAX_IMAGES = 5;

export function useImagePreviews() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Build previews whenever files change, and revoke them on cleanup
  useEffect(() => {
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    const urls: string[] = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);

    // Cleanup: revoke when files change again OR when the component unmounts
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const onSelect = (input: FileList | null): void => {
    if (!input) return;
    const arr: File[] = Array.from(input);
    if (arr.length > MAX_IMAGES) {
      alert(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setFiles(arr);
  };

  const clear = (): void => setFiles([]);

  return { files, previews, onSelect, clear };
}
