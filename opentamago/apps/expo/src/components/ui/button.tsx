import * as React from "react";
import { Pressable } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";
import { TextClassContext } from "~/components/ui/text";

const buttonVariants = cva(
  "group flex items-center justify-center rounded-md",
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
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <TextClassContext.Provider
      value={buttonTextVariants({ variant, size })}
    >
      <Pressable
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size, className })
        )}
        ref={ref}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
});
Button.displayName = "Button";

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
