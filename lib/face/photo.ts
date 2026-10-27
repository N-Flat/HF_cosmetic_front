export async function jpegPhoto(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const ratio = Math.min(1, 1920 / Math.max(width, height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("このブラウザは画像の変換に対応していません。");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("JPEGへの変換に失敗しました。")),
      "image/jpeg",
      0.92,
    ),
  );
  return { blob, w: canvas.width, h: canvas.height };
}
export async function loadPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPEG、PNG、WebP形式の画像を選択してください。");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("20MB以下の画像を選択してください。");
  const bitmap = await createImageBitmap(file);
  try {
    return await jpegPhoto(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
