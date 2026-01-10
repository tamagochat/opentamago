"use client";

import { memo } from "react";
import { SettingsHeader } from "./settings-header";
import { SettingsLeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";

type TabType = "personas" | "api-keys" | "models" | "database" | "contact";

interface SettingsLayoutProps {
  children: React.ReactNode;
  currentTab: TabType;
}

export const SettingsLayout = memo(function SettingsLayout({ children, currentTab }: SettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader />

      {/* Main content */}
      <div className="container px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left panel - hidden on mobile, shown on desktop */}
          <aside className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="sticky top-20">
              <SettingsLeftPanel />
            </div>
          </aside>

          <RightPanel currentTab={currentTab}>
            {children}
          </RightPanel>
        </div>
      </div>
    </div>
  );
});
