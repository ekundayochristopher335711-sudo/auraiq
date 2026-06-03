"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-violet-600 hover:bg-violet-500 text-white": variant === "primary",
          "hover:bg-white/10 text-gray-300 hover:text-white": variant === "ghost",
          "border border-white/20 hover:border-white/40 text-gray-300 hover:text-white": variant === "outline",
          "bg-red-600/20 hover:bg-red-600/30 text-red-400": variant === "danger",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
