"use client";
// This effect owns a browser Blob URL and revokes it when the resource changes.
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
export function usePhotoUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
