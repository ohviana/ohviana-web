/**
 * The API host (Vercel) refuses request bodies over 4.5 MB, so larger photos are shrunk in the
 * browser before upload. The API fits every photo within 1600px anyway, so nothing visible is
 * lost.
 */
const SEND_LIMIT = 4 * 1024 * 1024;
const MAX_EDGE = 2400;

/** `file` itself when it is small enough, else a re-encoded copy under the limit. */
export async function shrinkForUpload(file: File): Promise<File> {
  if (file.size <= SEND_LIMIT) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // Not decodable here: let the API give its usual message.
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP keeps transparency (logos); browsers that can't encode it fall back to JPEG.
  for (const quality of [0.9, 0.8, 0.7]) {
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (blob?.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= SEND_LIMIT) {
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      return new File([blob], file.name.replace(/\.[^.]*$/, '') + `.${ext}`, { type: blob.type });
    }
  }
  return file;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
