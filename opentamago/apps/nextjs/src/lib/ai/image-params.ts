/**
 * Image generation parameter mapping utilities.
 * Maps shared aspect ratio and resolution settings to model-specific API parameters.
 */

import type { AspectRatio, Resolution } from "./providers";

// ============================================================================
// Z-Image Turbo Mapping
// ============================================================================

/**
 * Z-Image Turbo image_size enum values.
 * Only some aspect ratios map directly to enum values.
 */
const Z_IMAGE_SIZE_MAP: Record<AspectRatio, string | null> = {
  "1:1": "square",
  "4:3": "landscape_4_3",
  "3:4": "portrait_4_3",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "21:9": null, // Custom dimensions needed
  "3:2": null, // Custom dimensions needed
  "2:3": null, // Custom dimensions needed
  "5:4": null, // Custom dimensions needed
  "4:5": null, // Custom dimensions needed
};

// ============================================================================
// Resolution to Dimensions Mapping
// ============================================================================

/**
 * Resolution to base dimension (longest side) mapping
 */
const RESOLUTION_DIMENSIONS: Record<Resolution, number> = {
  "1K": 1024,
  "2K": 2048,
  "4K": 4096,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate width/height from aspect ratio and resolution.
 * The base dimension is applied to the longer side.
 */
export function calculateDimensions(
  aspectRatio: AspectRatio,
  resolution: Resolution = "2K"
): { width: number; height: number } {
  const baseDim = RESOLUTION_DIMENSIONS[resolution];
  const parts = aspectRatio.split(":");
  const wRatio = Number(parts[0]) || 1;
  const hRatio = Number(parts[1]) || 1;

  if (wRatio >= hRatio) {
    // Landscape or square: width is the base
    const width = baseDim;
    const height = Math.round(baseDim * (hRatio / wRatio));
    return { width, height: Math.max(64, height) };
  } else {
    // Portrait: height is the base
    const height = baseDim;
    const width = Math.round(baseDim * (wRatio / hRatio));
    return { width: Math.max(64, width), height };
  }
}

// ============================================================================
// Model-Specific Parameter Builders
// ============================================================================

/**
 * Build Z-Image Turbo parameters.
 * Uses image_size enum when available, otherwise calculates dimensions.
 */
export function buildZImageTurboParams(
  aspectRatio: AspectRatio,
  resolution: Resolution = "2K"
): { image_size: string } | { image_size: { width: number; height: number } } {
  const sizeEnum = Z_IMAGE_SIZE_MAP[aspectRatio];

  if (sizeEnum) {
    // Use enum value - append _hd for higher resolutions
    if (resolution === "1K") {
      return { image_size: sizeEnum };
    }
    return { image_size: `${sizeEnum}_hd` };
  }

  // Custom dimensions for unsupported ratios
  const dims = calculateDimensions(aspectRatio, resolution);
  return { image_size: dims };
}

/**
 * Build Nano Banana parameters.
 * Uses aspect_ratio directly (native support).
 */
export function buildNanoBananaParams(aspectRatio: AspectRatio): {
  aspect_ratio: string;
} {
  return { aspect_ratio: aspectRatio };
}

/**
 * Build Nano Banana Pro parameters.
 * Uses both aspect_ratio and resolution (native support for both).
 */
export function buildNanoBananaProParams(
  aspectRatio: AspectRatio,
  resolution: Resolution = "2K"
): { aspect_ratio: string; resolution: Resolution } {
  return {
    aspect_ratio: aspectRatio,
    resolution,
  };
}

/**
 * Build parameters for FLUX and other generic models.
 * Uses calculated width/height dimensions.
 */
export function buildGenericImageParams(
  aspectRatio: AspectRatio,
  resolution: Resolution = "2K"
): { width: number; height: number } {
  return calculateDimensions(aspectRatio, resolution);
}

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Get image generation parameters for a specific model.
 * Routes to the appropriate parameter builder based on model ID.
 */
export function getImageParams(
  modelId: string,
  aspectRatio: AspectRatio,
  resolution: Resolution = "2K"
): Record<string, unknown> {
  // Z-Image Turbo
  if (modelId.includes("z-image/turbo")) {
    return buildZImageTurboParams(aspectRatio, resolution);
  }

  // Nano Banana Pro (check before nano-banana since it includes the prefix)
  if (modelId.includes("nano-banana-pro")) {
    return buildNanoBananaProParams(aspectRatio, resolution);
  }

  // Nano Banana
  if (modelId.includes("nano-banana")) {
    return buildNanoBananaParams(aspectRatio);
  }

  // Default: use dimensions for FLUX and other models
  return buildGenericImageParams(aspectRatio, resolution);
}
