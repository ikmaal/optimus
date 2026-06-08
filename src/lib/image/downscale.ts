/**
 * Client-side image downscaling. Resizes a captured photo so its longest edge
 * is at most `maxEdge` px and re-encodes as JPEG, cutting upload size, cost and
 * latency before the photo reaches the scan API.
 */
export async function downscaleImage(
  file: File,
  maxEdge = 1280,
  quality = 0.8,
): Promise<File> {
  if (typeof window === "undefined") return file;

  const bitmap = await loadBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));

  // Already small enough and already a JPEG — keep as-is.
  if (scale === 1 && file.type === "image/jpeg") {
    bitmap.close?.();
    return file;
  }

  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

async function loadBitmap(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // Fallback for environments without createImageBitmap.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return Object.assign(img as unknown as ImageBitmap, {
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
