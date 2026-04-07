import { type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap border text-sm font-semibold tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/92",
        secondary: "border-secondary-foreground/15 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-border bg-background text-foreground hover:bg-secondary",
        ghost: "border-transparent bg-transparent text-foreground hover:border-border hover:bg-secondary",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        command: "border-accent bg-accent text-accent-foreground hover:bg-accent/88",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-[11px]",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
