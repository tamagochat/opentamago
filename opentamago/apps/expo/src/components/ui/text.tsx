import * as React from "react";
import { Text as RNText } from "react-native";

import { cn } from "~/lib/utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RNText>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <RNText
      className={cn("text-base text-foreground", textClass, className)}
      {...props}
    />
  );
}

export { Text, TextClassContext };
