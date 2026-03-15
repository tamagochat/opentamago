"use client";

import { memo } from "react";
import { SettingsHeader } from "./settings-header";
import { SettingsLeftPanel } from "./left-panel";

interface SettingsShellProps {
  children: React.ReactNode;
}

/**
 * Shell component that wraps stable parts of the settings page.
 * Header and LeftPanel are memoized and won't re-render on route changes.
 * Only `children` (tab content) will update when navigating between tabs.
 */
export function SettingsShell({ children }: SettingsShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <MemoizedHeader />

      <div className="container px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left panel - hidden on mobile, shown on desktop */}
          <aside className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="sticky top-20">
              <MemoizedLeftPanel />
            </div>
          </aside>

          {/* Right panel - only this part re-renders on tab change */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized components that won't re-render when parent re-renders
const MemoizedHeader = memo(function MemoizedHeader() {
  return <SettingsHeader />;
});

const MemoizedLeftPanel = memo(function MemoizedLeftPanel() {
  return <SettingsLeftPanel />;
});
