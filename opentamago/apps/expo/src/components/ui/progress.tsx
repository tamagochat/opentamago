import * as React from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof View> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<
  React.ComponentRef<typeof View>,
  ProgressProps
>(({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <View
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      role="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
      {...props}
    >
      <View
        className={cn("h-full bg-primary rounded-full", indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </View>
  );
});
Progress.displayName = "Progress";

export { Progress };
