"use client";

import { memo } from "react";
import { SettingsTabNav } from "./tab-nav";
import { SettingsLeftPanel } from "./left-panel";

type TabType = "personas" | "api-keys" | "models" | "database" | "contact";

interface RightPanelProps {
  children: React.ReactNode;
  currentTab: TabType;
}

export const RightPanel = memo(function RightPanel({ children, currentTab }: RightPanelProps) {
  return (
    <div className="flex-1 min-w-0">
      {/* Tab navigation */}
      <SettingsTabNav currentTab={currentTab} />

      {/* Mobile left panel - shown only on mobile */}
      <div className="lg:hidden mb-6">
        <SettingsLeftPanel compact />
      </div>

      {/* Tab content */}
      <div className="mt-6">{children}</div>
    </div>
  );
});
