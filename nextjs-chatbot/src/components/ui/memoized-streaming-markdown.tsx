"use client";

import React, { useEffect, useState, useMemo, memo, useRef } from "react";
import { StreamingTextEffect } from "@/components/ui/streaming-text-effect";
import { Markdown } from "@/components/ui/Markdown";
import { marked } from "marked";

interface MarkdownToken {
    raw: string;
    [key: string]: any;
}

// Parses markdown content into discrete blocks that can be memoized individually
function parseMarkdownIntoBlocks(markdown: string): string[] {
    try {
        const tokens = marked.lexer(markdown) as MarkdownToken[];
        return tokens.map((token: MarkdownToken) => token.raw);
    } catch (error) {
        console.error("Error parsing markdown:", error);
        return [markdown]; // Fallback to treating the whole text as one block
    }
}

// Memoized component for an individual Markdown block
const MemoizedMarkdownBlock = memo(
    ({ content }: { content: string }) => {
        return <Markdown>{content}</Markdown>;
    },
    (prevProps, nextProps) => {
        // Only re-render if the content actually changed
        return prevProps.content === nextProps.content;
    }
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

interface MemoizedStreamingMarkdownProps {
    text: string;
    isStreaming: boolean;
    className?: string;
}

export const MemoizedStreamingMarkdown = ({
    text,
    isStreaming,
    className
}: MemoizedStreamingMarkdownProps) => {
    // Track if we've seen this content before to determine whether we need to show the animation
    const [hasProcessedContent, setHasProcessedContent] = useState(false);
    const prevTextRef = useRef<string>("");
    const [uniqueId] = useState(() => `markdown-${Math.random().toString(36).substring(2, 9)}`);
    const blocks = useMemo(() => parseMarkdownIntoBlocks(text), [text]);

    // Determine if the content is completely new and needs the streaming effect
    useEffect(() => {
        // If we're not streaming anymore and the text is stable, mark it as processed
        if (!isStreaming && text !== prevTextRef.current) {
            prevTextRef.current = text;

            // If we've changed content, we need to show the streaming effect again
            if (text !== prevTextRef.current) {
                setHasProcessedContent(false);
            }
        }

        // If streaming has ended, mark content as processed
        if (!isStreaming && text && text === prevTextRef.current) {
            setHasProcessedContent(true);
        }
    }, [isStreaming, text]);

    // Handle streaming completion
    const handleStreamingComplete = () => {
        if (!isStreaming) {
            setHasProcessedContent(true);
        }
    };

    // If we're actively streaming content or haven't fully processed it yet,
    // show the streaming effect
    if (isStreaming || !hasProcessedContent) {
        return (
            <StreamingTextEffect
                text={text}
                isStreaming={isStreaming}
                className={className}
                onComplete={handleStreamingComplete}
            />
        );
    }

    // Once content is fully processed and stable, show the formatted markdown
    return (
        <div className={className}>
            {blocks.map((block, index) => (
                <MemoizedMarkdownBlock
                    key={`${uniqueId}-block-${index}`}
                    content={block}
                />
            ))}
        </div>
    );
};

MemoizedStreamingMarkdown.displayName = 'MemoizedStreamingMarkdown';

// Export default as non-memoized for direct use
export default MemoizedStreamingMarkdown;
