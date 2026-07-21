import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";

export const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & { variant?: "default" | "outline"; size?: "default" | "sm" | "lg" }
>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
      "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      variant === "default" && "bg-transparent text-muted-foreground data-[state=on]:bg-muted data-[state=on]:text-foreground",
      variant === "outline" && "border border-input bg-transparent hover:bg-muted data-[state=on]:bg-muted",
      size === "default" && "h-9 px-3",
      size === "sm" && "h-8 px-2 text-xs",
      size === "lg" && "h-10 px-4",
      className
    )}
    {...props}
  />
));
Toggle.displayName = TogglePrimitive.Root.displayName;
