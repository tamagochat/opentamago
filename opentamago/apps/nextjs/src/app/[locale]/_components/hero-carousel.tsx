"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";

const images = [
  {
    src: "/examples/charx_viewer.png",
    alt: "CharX Viewer",
    description: "CharX files are parsed locally in your browser. Your files never leave your device.",
    width: 1200,
    height: 950,
  },
  {
    src: "/examples/p2p_share.png",
    alt: "P2P CharX Sharing",
    description: "No server in between. Share files directly with friends via WebRTC.",
    width: 1200,
    height: 870,
  },
  {
    src: "/examples/p2p_connect_lobby.png",
    alt: "P2P Connect Lobby",
    description: "No server means no one can monitor your chats. Invite friends with QR code.",
    width: 1100,
    height: 950,
  },
  {
    src: "/examples/p2p_connect_chat.png",
    alt: "P2P Connect Chat",
    description: "Chat with multiple AI characters. Your conversations stay between you and your friends.",
    width: 1200,
    height: 980,
  },
];

const VIEWPORT_HEIGHT = 500; // Fixed viewport height in pixels
const SCROLL_SPEED = 50; // Pixels per second
const PAUSE_AT_END = 1000; // Pause at bottom before transitioning (ms)
const TRANSITION_DURATION = 500; // Slide transition duration (ms)

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate the scaled height of current image based on container width
  const getScaledHeight = useCallback((index: number) => {
    if (!containerRef.current) return VIEWPORT_HEIGHT;
    const containerWidth = containerRef.current.offsetWidth;
    const img = images[index];
    if (!img) return VIEWPORT_HEIGHT;

    // Use actual loaded dimensions if available, otherwise use defaults
    const dims = imageDimensions[index] ?? { width: img.width, height: img.height };
    const scaledHeight = (dims.height / dims.width) * containerWidth;
    return scaledHeight;
  }, [imageDimensions]);

  // Get max scroll for current image
  const getMaxScroll = useCallback((index: number) => {
    const scaledHeight = getScaledHeight(index);
    return Math.max(0, scaledHeight - VIEWPORT_HEIGHT);
  }, [getScaledHeight]);

  const next = useCallback(() => {
    setIsTransitioning(true);
    setScrollY(0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  const prev = useCallback(() => {
    setIsTransitioning(true);
    setScrollY(0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  const goTo = useCallback((index: number) => {
    if (index === currentIndex) return;
    setIsTransitioning(true);
    setScrollY(0);
    setIsAutoPlaying(false);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, [currentIndex]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback((index: number, naturalWidth: number, naturalHeight: number) => {
    setImageDimensions(prev => {
      const newDims = [...prev];
      newDims[index] = { width: naturalWidth, height: naturalHeight };
      return newDims;
    });
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (!isAutoPlaying || isTransitioning) return;

    const maxScroll = getMaxScroll(currentIndex);

    // If image fits in viewport, just wait then move to next
    if (maxScroll <= 0) {
      const timer = setTimeout(next, 2000);
      return () => clearTimeout(timer);
    }

    // Scroll animation
    const interval = setInterval(() => {
      setScrollY((prev) => {
        const newScroll = prev + SCROLL_SPEED / 60; // 60fps

        if (newScroll >= maxScroll) {
          // Reached bottom, pause then go to next
          clearInterval(interval);
          setTimeout(next, PAUSE_AT_END);
          return maxScroll;
        }

        return newScroll;
      });
    }, 1000 / 60); // 60fps

    return () => clearInterval(interval);
  }, [isAutoPlaying, isTransitioning, currentIndex, getMaxScroll, next]);

  // Reset scroll when changing slides
  useEffect(() => {
    setScrollY(0);
  }, [currentIndex]);

  return (
    <div
      className="relative w-full max-w-4xl mx-auto"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      ref={containerRef}
    >
      {/* Main Image Container */}
      <div
        className="relative overflow-hidden rounded-lg border shadow-2xl bg-muted"
        style={{ height: VIEWPORT_HEIGHT }}
      >
        {images.map((image, index) => (
          <div
            key={image.src}
            className={cn(
              "absolute inset-0 w-full transition-opacity",
              isTransitioning ? "duration-500" : "duration-0",
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            <div
              className="w-full transition-transform duration-100 ease-linear"
              style={{
                transform: index === currentIndex ? `translateY(-${scrollY}px)` : "translateY(0)",
              }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="w-full h-auto"
                priority={index === 0}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  handleImageLoad(index, img.naturalWidth, img.naturalHeight);
                }}
              />
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 z-20"
          onClick={prev}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 z-20"
          onClick={next}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Scroll Progress Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20 z-20">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{
              width: `${Math.min(100, (scrollY / Math.max(1, getMaxScroll(currentIndex))) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {images.map((image, index) => (
          <button
            key={image.src}
            onClick={() => goTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex
                ? "bg-primary w-6"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Caption */}
      <div className="text-center mt-3">
        <p className="font-medium">{images[currentIndex]?.alt}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {images[currentIndex]?.description}
        </p>
      </div>
    </div>
  );
}
