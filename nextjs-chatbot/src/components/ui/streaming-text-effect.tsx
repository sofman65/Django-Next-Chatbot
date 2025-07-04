"use client";
import { useEffect, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

interface StreamingTextEffectProps {
    text: string;
    className?: string;
    filter?: boolean;
    duration?: number;
    onComplete?: () => void;
    isStreaming?: boolean;
}

export const StreamingTextEffect = ({
    text,
    className,
    filter = true,
    duration = 0.3,
    onComplete,
    isStreaming = false,
}: StreamingTextEffectProps) => {
    const [scope, animate] = useAnimate();
    const [displayedText, setDisplayedText] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (text !== displayedText && !isAnimating) {
            console.log("StreamingTextEffect update:", { text, isStreaming }) // Debug log
            setIsAnimating(true);
            setDisplayedText(text);

            // Animate new words
            const spans = scope.current?.querySelectorAll("span");
            if (spans) {
                animate(
                    "span",
                    {
                        opacity: 1,
                        filter: filter ? "blur(0px)" : "none",
                    },
                    {
                        duration: duration,
                        delay: stagger(0.1),
                    }
                ).then(() => {
                    setIsAnimating(false);
                    if (!isStreaming && onComplete) {
                        onComplete();
                    }
                });
            }
        }
    }, [text, displayedText, animate, duration, filter, isStreaming, onComplete, isAnimating, scope]);

    const renderWords = () => {
        const wordsArray = displayedText.split(" ");

        return (
            <motion.div ref={scope} className="flex flex-wrap">
                {wordsArray.map((word, idx) => (
                    <motion.span
                        key={`${word}-${idx}`}
                        className="text-white opacity-0 mr-1"
                        style={{
                            filter: filter ? "blur(10px)" : "none",
                        }}
                    >
                        {word}
                    </motion.span>
                ))}
                {isStreaming && (
                    <motion.span
                        className="text-gray-400 opacity-75 inline-block ml-1"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        ▋
                    </motion.span>
                )}
            </motion.div>
        );
    };

    return (
        <div className={cn("font-normal text-base leading-relaxed", className)}>
            {renderWords()}
        </div>
    );
};
