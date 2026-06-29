import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-display font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            // Variants matching DESIGN.md tokens
            "bg-brand-primary text-bg-base hover:brightness-110 shadow-lg shadow-brand-primary/10": variant === "primary",
            "bg-surface-2 text-text-primary hover:bg-surface-2/80 border border-border-subtle": variant === "secondary",
            "border border-border-subtle bg-transparent text-text-primary hover:bg-surface-1/50": variant === "outline",
            "text-text-secondary hover:bg-surface-1/50 hover:text-text-primary": variant === "ghost",
            
            // Sizes mapped to perfect spacing rhythm
            "h-9 px-4 text-xs rounded-lg": size === "sm",
            "h-11 px-6 text-sm rounded-xl": size === "md",
            "h-13 px-8 text-base rounded-2xl": size === "lg",
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
