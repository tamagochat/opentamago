"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Check } from "lucide-react";
import {
  IMAGE_PROVIDERS,
  PROVIDER_CONFIGS,
  IMAGE_MODEL_CONFIGS,
  ASPECT_RATIOS,
  RESOLUTIONS,
  type ImageProvider,
  type AspectRatio,
  type Resolution,
} from "~/lib/ai";

export interface ImageTabSaveData {
  enabled: boolean;
  provider: ImageProvider;
  model: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
}

export interface ImageTabRef {
  getSaveData: () => ImageTabSaveData;
}

interface ImageTabProps {
  initialEnabled: boolean;
  initialProvider: ImageProvider;
  initialModel: string;
  initialAspectRatio: AspectRatio;
  initialResolution: Resolution;
  isProviderReady: (providerId: ImageProvider) => boolean;
}

/** Display labels for aspect ratios */
const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  "1:1": "Square (1:1)",
  "4:3": "Landscape 4:3",
  "3:4": "Portrait 3:4",
  "16:9": "Widescreen 16:9",
  "9:16": "Vertical 9:16",
  "21:9": "Ultrawide 21:9",
  "3:2": "Photo 3:2",
  "2:3": "Photo Portrait 2:3",
  "5:4": "Classic 5:4",
  "4:5": "Instagram 4:5",
};

/** Display labels for resolutions */
const RESOLUTION_LABELS: Record<Resolution, string> = {
  "1K": "1K (1024px)",
  "2K": "2K (2048px)",
  "4K": "4K (4096px)",
};

export const ImageTab = forwardRef<ImageTabRef, ImageTabProps>(
  function ImageTab(
    {
      initialEnabled,
      initialProvider,
      initialModel,
      initialAspectRatio,
      initialResolution,
      isProviderReady,
    },
    ref
  ) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [imageProvider, setImageProvider] =
      useState<ImageProvider>(initialProvider);
    const [imageModel, setImageModel] = useState(initialModel);
    const [aspectRatio, setAspectRatio] =
      useState<AspectRatio>(initialAspectRatio);
    const [resolution, setResolution] =
      useState<Resolution>(initialResolution);

    // Sync with initial values when they change
    useEffect(() => {
      setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
      setImageProvider(initialProvider);
    }, [initialProvider]);

    useEffect(() => {
      setImageModel(initialModel);
    }, [initialModel]);

    useEffect(() => {
      setAspectRatio(initialAspectRatio);
    }, [initialAspectRatio]);

    useEffect(() => {
      setResolution(initialResolution);
    }, [initialResolution]);

    useImperativeHandle(ref, () => ({
      getSaveData: () => ({
        enabled,
        provider: imageProvider,
        model: imageModel,
        aspectRatio,
        resolution,
      }),
    }));

    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="mb-1 font-medium">Image Generation</h3>
          <p className="text-xs text-muted-foreground">
            Configure AI providers and models for image generation.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="image-enabled">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable image generation
              </p>
            </div>
            <Switch
              id="image-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Provider Select */}
          <div className="grid gap-2">
            <Label htmlFor="image-provider">Provider</Label>
            <Select
              value={imageProvider}
              onValueChange={(v) => setImageProvider(v as ImageProvider)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_PROVIDERS.map((providerId) => {
                  const config = PROVIDER_CONFIGS[providerId];
                  const isReady = isProviderReady(providerId);
                  return (
                    <SelectItem key={providerId} value={providerId}>
                      <span className="flex items-center gap-2">
                        {config.name}
                        {isReady && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Model Select */}
          <div className="grid gap-2">
            <Label htmlFor="image-model">Model</Label>
            <Select value={imageModel} onValueChange={setImageModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODEL_CONFIGS[imageProvider]?.models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio Select */}
          <div className="grid gap-2">
            <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
            <Select
              value={aspectRatio}
              onValueChange={(v) => setAspectRatio(v as AspectRatio)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ASPECT_RATIO_LABELS[ratio]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution Select */}
          <div className="grid gap-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Select
              value={resolution}
              onValueChange={(v) => setResolution(v as Resolution)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((res) => (
                  <SelectItem key={res} value={res}>
                    {RESOLUTION_LABELS[res]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Higher resolutions produce larger images but take longer
            </p>
          </div>
        </div>
      </div>
    );
  }
);
