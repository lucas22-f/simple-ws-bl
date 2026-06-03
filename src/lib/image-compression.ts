export const PRODUCT_IMAGE_TARGET_TYPE = "image/webp";
export const PRODUCT_IMAGE_MAX_EDGE = 1200;
export const PRODUCT_IMAGE_QUALITY = 0.78;

type CompressionOptions = {
  maxEdge?: number;
  quality?: number;
};

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "") || "product-image";
  return `${baseName}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("No pudimos optimizar la imagen"));
      },
      type,
      quality,
    );
  });
}

export async function compressProductImage(file: File, options: CompressionOptions = {}) {
  const maxEdge = options.maxEdge ?? PRODUCT_IMAGE_MAX_EDGE;
  const quality = options.quality ?? PRODUCT_IMAGE_QUALITY;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("No pudimos preparar la imagen");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas, PRODUCT_IMAGE_TARGET_TYPE, quality);

  return new File([blob], replaceExtension(file.name, "webp"), {
    type: PRODUCT_IMAGE_TARGET_TYPE,
    lastModified: Date.now(),
  });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
