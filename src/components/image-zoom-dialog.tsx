"use client";

import { memo, useState, useCallback, type ReactNode } from "react";
import { X, Download, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ImageZoomDialogProps {
  /** The image source URL or data URL */
  src: string;
  /** Alt text for the image */
  alt?: string;
  /** Optional className for the thumbnail wrapper */
  className?: string;
  /** Optional className for the thumbnail image */
  imageClassName?: string;
  /** Optional inline styles for the thumbnail image */
  imageStyle?: React.CSSProperties;
  /** Optional download filename (enables download button) */
  downloadFilename?: string;
  /** Whether to show zoom indicator on hover */
  showZoomIndicator?: boolean;
  /** Custom thumbnail element (if not provided, uses img with src) */
  children?: ReactNode;
}

/**
 * Reusable component that displays a clickable image thumbnail
 * that opens a fullscreen zoom dialog when clicked.
 *
 * Used in:
 * - /chat message attachments (message-attachment.tsx)
 * - /charx/editor assistant messages (assistant-message.tsx)
 * - /chat message bubble inline images (message-bubble.tsx)
 */
export const ImageZoomDialog = memo(function ImageZoomDialog({
  src,
  alt = "Image",
  className,
  imageClassName,
  imageStyle,
  downloadFilename,
  showZoomIndicator = true,
  children,
}: ImageZoomDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = useCallback(() => {
    if (!downloadFilename) return;

    const link = document.createElement("a");
    link.href = src;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, downloadFilename]);

  return (
    <>
      {/* Thumbnail - clickable to open zoom dialog */}
      <button
        type="button"
        className={cn(
          "relative group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg",
          className
        )}
        onClick={() => setIsOpen(true)}
        aria-label={`View ${alt} in fullscreen`}
      >
        {children ?? (
          <img
            src={src}
            alt={alt}
            className={cn(
              "rounded-lg transition-opacity group-hover:opacity-90",
              imageClassName
            )}
            style={imageStyle}
          />
        )}
        {/* Zoom indicator on hover */}
        {showZoomIndicator && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
            <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
        )}
      </button>

      {/* Fullscreen Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Download button (optional) */}
            {downloadFilename && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-16 z-10 text-white hover:bg-white/20 h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                aria-label="Download image"
              >
                <Download className="h-6 w-6" />
              </Button>
            )}

            {/* Full-size image */}
            <img
              src={src}
              alt={alt}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </DialogPortal>
      </Dialog>
    </>
  );
});
