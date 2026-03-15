import * as React from "react";
import { Text as RNText } from "react-native";

import { cn } from "~/lib/utils";

const TextClassContext = React.createContext<string>("text-base text-foreground");

function Text({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RNText>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <RNText className={cn(textClass, className)} {...props} />
  );
}

export { Text, TextClassContext };
