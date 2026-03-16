import * as React from "react";
import { Text as RNText } from "react-native";

import { cn } from "~/lib/utils";

const Label = React.forwardRef<
  React.ComponentRef<typeof RNText>,
  React.ComponentPropsWithoutRef<typeof RNText>
>(({ className, ...props }, ref) => (
  <RNText
    ref={ref}
    className={cn(
      "text-sm native:text-base font-medium leading-none text-foreground",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
