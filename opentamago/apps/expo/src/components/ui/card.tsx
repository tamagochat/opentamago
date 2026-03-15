import * as React from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";
import { TextClassContext } from "~/components/ui/text";

const Card = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn(
      "rounded-2xl border border-border bg-card",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn("flex flex-col gap-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <TextClassContext.Provider value="text-2xl text-card-foreground font-semibold leading-none tracking-tight">
    <View ref={ref} className={className} {...props} />
  </TextClassContext.Provider>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <TextClassContext.Provider value="text-sm text-muted-foreground">
    <View ref={ref} className={className} {...props} />
  </TextClassContext.Provider>
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
  <View
    ref={ref}
    className={cn("flex flex-row items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
