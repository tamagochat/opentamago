import { cva, type VariantProps } from "class-variance-authority";
import { View } from "react-native";

import { cn } from "~/lib/utils";
import { TextClassContext } from "~/components/ui/text";

const badgeVariants = cva(
  "items-center rounded-full border border-border px-2.5 py-0.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary",
        secondary: "border-transparent bg-secondary",
        destructive: "border-transparent bg-destructive",
        outline: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const badgeTextVariants = cva("text-xs font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Badge({
  className,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> &
  VariantProps<typeof badgeVariants>) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
