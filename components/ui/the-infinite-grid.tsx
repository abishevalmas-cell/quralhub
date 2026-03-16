import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame
} from "framer-motion";

export const InfiniteGridBackground = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    gridOffsetX.set((gridOffsetX.get() + 0.3) % 40);
    gridOffsetY.set((gridOffsetY.get() + 0.3) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn("relative w-full overflow-hidden", className)}
    >
      {/* Base grid — very subtle */}
      <div className="absolute inset-0 z-0 opacity-[0.04]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>
      {/* Mouse-follow reveal grid */}
      <motion.div
        className="absolute inset-0 z-0 opacity-30"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* Ambient color glow orbs — light theme only */}
      <div className="absolute inset-0 pointer-events-none z-0 dark:hidden">
        <div className="absolute right-[-15%] top-[-15%] w-[40%] h-[40%] rounded-full bg-orange-500/[0.07] blur-[120px]" />
        <div className="absolute right-[15%] top-[5%] w-[20%] h-[20%] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
        <div className="absolute left-[-10%] bottom-[-10%] w-[35%] h-[35%] rounded-full bg-blue-500/[0.07] blur-[120px]" />
        <div className="absolute left-[20%] top-[30%] w-[25%] h-[25%] rounded-full bg-cyan-400/[0.05] blur-[100px]" />
      </div>

      {/* Content on top */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const GridPattern = ({ offsetX, offsetY }: { offsetX: ReturnType<typeof useMotionValue<number>>; offsetY: ReturnType<typeof useMotionValue<number>> }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="quralhub-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#quralhub-grid)" />
    </svg>
  );
};
