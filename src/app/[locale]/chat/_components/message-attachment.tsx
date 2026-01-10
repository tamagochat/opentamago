"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ImageZoomDialog } from "~/components/image-zoom-dialog";
import type { MessageAttachmentMeta } from "~/lib/db/schemas";

interface MessageAttachmentProps {
  /** Message ID that owns this attachment */
  messageId: string;
  /** Attachment metadata */
  attachment: MessageAttachmentMeta;
  /** Function to get attachment data URL */
  getAttachmentDataUrl: (messageId: string, attachmentId: string) => Promise<string | null>;
  /** Function to get attachment blob (for audio) */
  getAttachmentBlob: (messageId: string, attachmentId: string) => Promise<Blob | null>;
}

/**
 * Renders a message attachment (image or audio)
 */
export const MessageAttachment = memo(function MessageAttachment({
  messageId,
  attachment,
  getAttachmentDataUrl,
  getAttachmentBlob,
}: MessageAttachmentProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load attachment data on mount
  useEffect(() => {
    let cancelled = false;

    const loadAttachment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = await getAttachmentDataUrl(messageId, attachment.id);
        if (!cancelled) {
          if (url) {
            setDataUrl(url);
          } else {
            setError("Failed to load attachment");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load attachment");
          console.error("[MessageAttachment] Load error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAttachment();

    return () => {
      cancelled = true;
    };
  }, [messageId, attachment.id, getAttachmentDataUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 w-32 bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="flex items-center justify-center h-32 w-32 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">{error ?? "Not found"}</span>
      </div>
    );
  }

  if (attachment.type === "image") {
    return (
      <ImageAttachment
        dataUrl={dataUrl}
        width={attachment.width}
        height={attachment.height}
      />
    );
  }

  if (attachment.type === "audio") {
    return (
      <AudioAttachment
        dataUrl={dataUrl}
        duration={attachment.duration}
        mimeType={attachment.mimeType}
      />
    );
  }

  return null;
});

/**
 * Image attachment renderer
 */
const ImageAttachment = memo(function ImageAttachment({
  dataUrl,
  width,
  height,
}: {
  dataUrl: string;
  width?: number;
  height?: number;
}) {
  return (
    <ImageZoomDialog
      src={dataUrl}
      alt="Generated image"
      imageClassName="max-w-full h-auto"
      imageStyle={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
      downloadFilename={`image_${Date.now()}.png`}
    />
  );
});

/**
 * Audio attachment renderer with playback controls
 */
const AudioAttachment = memo(function AudioAttachment({
  dataUrl,
  duration,
  mimeType,
}: {
  dataUrl: string;
  duration?: number;
  mimeType: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setAudioDuration(audio.duration || duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(audio.muted);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("volumechange", handleVolumeChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [duration]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 min-w-[200px]">
      <audio ref={audioRef} src={dataUrl} preload="metadata" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={togglePlayback}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={toggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
});

/**
 * Container for rendering all attachments on a message
 */
export const MessageAttachments = memo(function MessageAttachments({
  messageId,
  attachments,
  getAttachmentDataUrl,
  getAttachmentBlob,
}: {
  messageId: string;
  attachments: MessageAttachmentMeta[];
  getAttachmentDataUrl: (messageId: string, attachmentId: string) => Promise<string | null>;
  getAttachmentBlob: (messageId: string, attachmentId: string) => Promise<Blob | null>;
}) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      {attachments.map((attachment) => (
        <MessageAttachment
          key={attachment.id}
          messageId={messageId}
          attachment={attachment}
          getAttachmentDataUrl={getAttachmentDataUrl}
          getAttachmentBlob={getAttachmentBlob}
        />
      ))}
    </div>
  );
});
