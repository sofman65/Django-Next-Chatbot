"use client";
import { cn } from "@/lib/utils";
import { useMotionValue, motion, useMotionTemplate } from "motion/react";
import React from "react";

export const HeroHighlight = ({
    children,
    className,
    containerClassName,
}: {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
}) => {
    let mouseX = useMotionValue(0);
    let mouseY = useMotionValue(0);

    // SVG patterns for different states and themes
    const dotPatterns = {
        light: {
            default: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3E%3Ccircle fill='%23d4d4d4' id='pattern-circle' cx='10' cy='10' r='2.5'%3E%3C/circle%3E%3C/svg%3E")`,
            hover: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3E%3Ccircle fill='%233b82f6' id='pattern-circle' cx='10' cy='10' r='2.5'%3E%3C/circle%3E%3C/svg%3E")`,
        },
        dark: {
            default: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='20' height='20' fill='none'%3E%3Ccircle fill='%23101010' id='pattern-circle' cx='10' cy='10' r='1.5'%3E%3C/circle%3E%3C/svg%3E")`,
            hover: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='20' height='20' fill='none'%3E%3Ccircle fill='%2310b981' id='pattern-circle' cx='10' cy='10' r='2'%3E%3C/circle%3E%3C/svg%3E")`,
        },
    };

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: React.MouseEvent<HTMLDivElement>) {
        if (!currentTarget) return;
        let { left, top } = currentTarget.getBoundingClientRect();

        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }
    return (<div
        className={cn(
            "group absolute inset-0 w-full h-full dark:bg-gray-950 z-0",
            containerClassName,
        )}
        onMouseMove={handleMouseMove}
    >
        <div
            className="pointer-events-none absolute inset-0 dark:hidden"
            style={{
                backgroundImage: dotPatterns.light.default,
            }}
        />
        <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{
                backgroundImage: dotPatterns.dark.default,
            }}
        />
        <motion.div
            className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 ease-in-out group-hover:opacity-100 dark:hidden"
            style={{
                backgroundImage: dotPatterns.light.hover,
                WebkitMaskImage: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
                maskImage: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
            }}
        />
        <motion.div
            className="pointer-events-none absolute inset-0 hidden opacity-0 transition duration-500 ease-in-out group-hover:opacity-100 dark:block"
            style={{
                backgroundImage: dotPatterns.dark.hover,
                WebkitMaskImage: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
                maskImage: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
            }}
        />
        {children && <div className={cn("relative", className)}>{children}</div>}
    </div>
    );
};

export const Highlight = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <motion.span
            initial={{
                backgroundSize: "0% 100%",
            }}
            animate={{
                backgroundSize: "100% 100%",
            }}
            transition={{
                duration: 2,
                ease: "linear",
                delay: 0.5,
            }}
            style={{
                backgroundRepeat: "no-repeat",
                backgroundPosition: "left center",
                display: "inline",
            }}
            className={cn(
                `relative inline-block rounded-lg bg-gradient-to-r from-blue-300 via-teal-300 to-emerald-300 px-1 pb-1 dark:from-blue-500 dark:via-teal-500 dark:to-emerald-500`,
                className,
            )}
        >
            {children}
        </motion.span>
    );
};
