import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "w-full h-10 px-3 rounded-lg bg-bg-3 border text-bg-11 text-sm",
            "placeholder:text-bg-7 transition-colors duration-fast",
            "focus:outline-none focus:ring-2 focus:ring-mint-9 focus:border-transparent",
            error ? "border-danger" : "border-bg-5 hover:border-bg-6",
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
