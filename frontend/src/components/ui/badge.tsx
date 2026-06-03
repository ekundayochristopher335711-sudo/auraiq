import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "strong" | "moderate" | "weak" | "critical" | "high" | "medium" | "pro" | "free";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "medium", children, className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      {
        "bg-emerald-500/20 text-emerald-400": variant === "strong",
        "bg-amber-500/20 text-amber-400": variant === "moderate",
        "bg-red-500/20 text-red-400": variant === "weak" || variant === "critical",
        "bg-orange-500/20 text-orange-400": variant === "high",
        "bg-blue-500/20 text-blue-400": variant === "medium",
        "bg-violet-500/20 text-violet-400": variant === "pro",
        "bg-gray-500/20 text-gray-400": variant === "free",
      },
      className
    )}>
      {children}
    </span>
  );
}
