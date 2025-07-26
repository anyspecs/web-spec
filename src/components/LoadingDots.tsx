import React from "react";
import { cn } from "@/utils/cn";

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingDots({ className, size = "md" }: LoadingDotsProps) {
  // 不同尺寸的配置
  const sizeConfig = {
    sm: {
      dotSize: "w-2 h-2",
      spacing: "space-x-1",
      container: "w-8 h-4",
    },
    md: {
      dotSize: "w-3 h-3",
      spacing: "space-x-1.5",
      container: "w-12 h-6",
    },
    lg: {
      dotSize: "w-4 h-4",
      spacing: "space-x-2",
      container: "w-16 h-8",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center justify-center", config.container, className)}>
      <div className={cn("flex items-center", config.spacing)}>
        <div
          className={cn(
            config.dotSize,
            "bg-gray-600 rounded-full animate-bounce"
          )}
          style={{
            animationDelay: "0ms",
            animationDuration: "1.4s",
          }}
        />
        <div
          className={cn(
            config.dotSize,
            "bg-gray-600 rounded-full animate-bounce"
          )}
          style={{
            animationDelay: "160ms",
            animationDuration: "1.4s",
          }}
        />
        <div
          className={cn(
            config.dotSize,
            "bg-gray-600 rounded-full animate-bounce"
          )}
          style={{
            animationDelay: "320ms",
            animationDuration: "1.4s",
          }}
        />
      </div>
    </div>
  );
}