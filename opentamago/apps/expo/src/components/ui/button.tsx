import * as React from "react";
import { Pressable } from "react-native";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";
import { Text } from "~/components/ui/text";
import { TextClassContext } from "~/components/ui/text";

const buttonVariants = cva(
  "group flex-row items-center justify-center gap-2 rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-90",
        destructive: "bg-destructive active:opacity-90",
        outline:
          "border border-input bg-background active:bg-accent",
        secondary: "bg-secondary active:opacity-80",
        ghost: "active:bg-accent",
        link: "",
      },
      size: {
        default: "h-10 native:h-12 px-4 native:px-5",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 native:h-14 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva("text-sm native:text-base font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary underline",
    },
    size: {
      default: "",
      sm: "",
      lg: "native:text-lg",
      icon: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    textClassName?: string;
  };

const Button = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(({ children, className, textClassName, variant, size, ...props }, ref) => {
  const textClassValue = cn(buttonTextVariants({ variant, size }), textClassName);

  const normalizedChildren =
    typeof children === "function"
      ? children
      : React.Children.map(children, (child) => {
          if (typeof child === "string" || typeof child === "number") {
            return <Text>{child}</Text>;
          }

          return child;
        });

  return (
    <TextClassContext.Provider value={textClassValue}>
      <Pressable
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size, className })
        )}
        ref={ref}
        role="button"
        {...props}
      >
        {normalizedChildren}
      </Pressable>
    </TextClassContext.Provider>
  );
});
Button.displayName = "Button";

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
