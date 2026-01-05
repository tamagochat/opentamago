/**
 * Image conversion and compression utilities for RxDB attachments
 */

/**
 * Check if a blob is already in WebP format
 */
export function isWebP(blob: Blob): boolean {
  return blob.type === "image/webp";
}

/**
 * Convert an image file or data URL to WebP format with compression
 * @param input - File, Blob, or data URL string
 * @param quality - WebP quality (0-1), default 0.85
 * @param maxWidth - Maximum width, maintains aspect ratio
 * @param maxHeight - Maximum height, maintains aspect ratio
 * @returns WebP Blob
 */
export async function convertToWebP(
  input: File | Blob | string,
  options: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<Blob> {
  const { quality = 0.85, maxWidth = 512, maxHeight = 512 } = options;

  // If input is already a WebP blob, return it as-is
  if (input instanceof Blob && isWebP(input)) {
    return input;
  }

  // Create image element
  const img = new Image();
  const objectUrl =
    typeof input === "string" ? input : URL.createObjectURL(input);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = objectUrl;
  });

  // Clean up object URL if we created one
  if (typeof input !== "string") {
    URL.revokeObjectURL(objectUrl);
  }

  // Calculate dimensions maintaining aspect ratio
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }

  // Create canvas and draw resized image
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(img, 0, 0, width, height);

  // Convert to WebP blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to convert to WebP"));
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Get data URL from blob for display
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Uint8Array to Blob
 * @param data - Uint8Array from CharX assets
 * @param mimeType - MIME type of the image
 */
export function uint8ArrayToBlob(
  data: Uint8Array,
  mimeType: string = "image/png"
): Blob {
  // Create a new Uint8Array to ensure we have a proper ArrayBuffer
  const buffer = new Uint8Array(data);
  return new Blob([buffer], { type: mimeType });
}

/**
 * Detect MIME type from Uint8Array by checking magic bytes
 */
export function detectImageMimeType(data: Uint8Array): string {
  // PNG magic bytes
  if (
    data.length >= 4 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG magic bytes
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) {
    return "image/jpeg";
  }

  // WebP magic bytes
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return "image/webp";
  }

  // GIF magic bytes
  if (
    data.length >= 3 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46
  ) {
    return "image/gif";
  }

  // Default to PNG
  return "image/png";
}
