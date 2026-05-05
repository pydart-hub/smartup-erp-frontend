"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary shadow-sm active:scale-[0.97]",
        secondary:
          "bg-secondary text-white hover:bg-secondary-hover focus-visible:ring-secondary shadow-sm active:scale-[0.97]",
        outline:
          "border border-border-input bg-surface text-text-primary hover:bg-brand-wash hover:border-primary focus-visible:ring-primary active:scale-[0.97]",
        ghost:
          "text-text-secondary hover:bg-brand-wash hover:text-primary focus-visible:ring-primary",
        danger:
          "bg-error text-white hover:bg-red-700 focus-visible:ring-error shadow-sm active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[8px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    if (asChild) {
      return (
        <motion.div
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="inline-flex"
        >
          <Slot
            className={cn(buttonVariants({ variant, size, className }), isDisabled && "pointer-events-none opacity-50")}
            ref={ref as React.Ref<HTMLElement>}
            aria-disabled={isDisabled}
            {...props}
          >
            {children}
          </Slot>
        </motion.div>
      );
    }

    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="inline-flex"
      >
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={isDisabled}
          {...props}
        >
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </button>
      </motion.div>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
