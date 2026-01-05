import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "~/i18n/routing";

export interface NavigationState {
  isNavigatingAway: boolean;
  isTabClosing: boolean;
  isTabHidden: boolean;
}

/**
 * Hook to detect navigation events
 * - In-app navigation: User navigates to another page within the app
 * - Tab closing/refresh: User closes tab or refreshes page
 * - Tab visibility: User switches tabs
 */
export function useNavigationDetector(onNavigateAway?: () => void) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const onNavigateAwayRef = useRef(onNavigateAway);

  // Keep callback ref up to date
  useEffect(() => {
    onNavigateAwayRef.current = onNavigateAway;
  }, [onNavigateAway]);

  // Detect in-app navigation
  useEffect(() => {
    if (pathname !== previousPathnameRef.current) {
      // Navigated to a different page
      if (onNavigateAwayRef.current) {
        onNavigateAwayRef.current();
      }
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Detect tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // This fires when user closes tab, refreshes, or navigates away from domain
      // Note: We can't reliably distinguish between these events
      return; // Don't show confirmation dialog
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Detect tab visibility changes
  const handleVisibilityChange = useCallback(() => {
    return document.hidden;
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    isNavigatingAway: pathname !== previousPathnameRef.current,
    isTabHidden: typeof document !== "undefined" ? document.hidden : false,
  };
}

/**
 * Hook to run cleanup on tab close/refresh
 */
export function useBeforeUnload(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupRef.current();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
