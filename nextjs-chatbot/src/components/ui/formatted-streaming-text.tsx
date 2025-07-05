"use client";

import React, { useEffect, useState, useRef } from "react";
import { Markdown } from "@/components/ui/Markdown";
import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check, Terminal } from "lucide-react";

// Custom style override for the syntax highlighter
const customSyntaxStyle = {
    ...atomDark,
    'code[class*="language-"]': {
        ...atomDark['code[class*="language-"]'],
        color: '#e6f1ff',
    },
    'pre[class*="language-"]': {
        ...atomDark['pre[class*="language-"]'],
        background: 'transparent',
    },
    comment: {
        ...atomDark.comment,
        color: '#64748b', // More visible comments
    },
    function: {
        ...atomDark.function,
        color: '#14b8a6', // DoChat teal
    },
    string: {
        ...atomDark.string,
        color: '#10b981', // DoChat emerald
    },
    keyword: {
        ...atomDark.keyword,
        color: '#2563eb', // DoChat blue
    },
};

// Separate component for code blocks to handle state properly
const CodeBlock = ({ code, language }: { code: string, language?: string }) => {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Language display text
    const languageDisplay = language === 'bash' ? 'terminal' : language;

    return (
        <div
            className="relative w-full rounded-lg p-0.5 font-mono text-sm my-4 overflow-hidden"
            style={{
                background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.15), rgba(20, 184, 166, 0.15))',
                boxShadow: isHovered
                    ? '0 0 0 1px rgba(37, 99, 235, 0.3), 0 4px 16px rgba(37, 99, 235, 0.1), 0 2px 4px rgba(20, 184, 166, 0.05)'
                    : '0 0 0 1px rgba(37, 99, 235, 0.2), 0 2px 8px rgba(37, 99, 235, 0.05)',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header bar with language and copy button */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800/50 bg-gray-900/95">
                <div className="flex items-center gap-2">
                    {language === 'bash' ? (
                        <Terminal size={14} className="text-teal-400" />
                    ) : (
                        <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-teal-500" />
                    )}
                    <span className="text-xs font-medium text-gray-300">
                        {languageDisplay || 'code'}
                    </span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-800/70 text-gray-300 hover:text-white hover:bg-gray-700/70 transition-colors font-sans"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <>
                            <Check size={14} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={14} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code content */}
            <div className="bg-gray-900/95 p-4 overflow-x-auto">
                <SyntaxHighlighter
                    language={language || "text"}
                    style={customSyntaxStyle}
                    customStyle={{
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        fontSize: "0.875rem",
                    }}
                    wrapLines={true}
                    showLineNumbers={true}
                    lineNumberStyle={{
                        minWidth: '2.5em',
                        paddingRight: '1em',
                        textAlign: 'right',
                        color: 'rgba(148, 163, 184, 0.6)',
                        userSelect: 'none',
                    }}
                    lineProps={(lineNumber: number) => ({
                        style: {
                            display: "block",
                            width: "100%",
                        },
                    })}
                    PreTag="div"
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

// Separate component for indented code
const IndentedCode = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="my-2 relative rounded-lg p-0.5 overflow-hidden"
            style={{
                background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.1), rgba(20, 184, 166, 0.1))',
                boxShadow: isHovered
                    ? '0 0 0 1px rgba(37, 99, 235, 0.2), 0 2px 8px rgba(37, 99, 235, 0.05)'
                    : '0 0 0 1px rgba(37, 99, 235, 0.1), 0 1px 4px rgba(37, 99, 235, 0.05)',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute right-2 top-2">
                <button
                    onClick={copyToClipboard}
                    className="flex items-center justify-center p-1 rounded bg-gray-800/70 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy code"
                >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
            </div>
            <SyntaxHighlighter
                language="text"
                style={customSyntaxStyle}
                customStyle={{
                    margin: 0,
                    padding: 16,
                    background: '#0f172a', // darker background
                    fontSize: "0.875rem",
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

interface FormattedStreamingTextProps {
    text: string;
    isStreaming: boolean;
    className?: string;
}

/**
 * A component that shows text streaming in with animated words,
 * and properly formats it as Markdown once streaming is complete.
 */
export default function FormattedStreamingText({
    text,
    isStreaming,
    className
}: FormattedStreamingTextProps) {
    // Store the last complete version of the text for the final render
    const [finalText, setFinalText] = useState("");
    const [scope, animate] = useAnimate();
    const [displayedText, setDisplayedText] = useState("");
    const [isAnimating, setIsAnimating] = useState(false);

    // Reference to track if we should show markdown yet
    const shouldShowMarkdown = useRef(false);

    // Similar to the original StreamingTextEffect, animate new words as they appear
    useEffect(() => {
        if (text !== displayedText && !isAnimating) {
            setIsAnimating(true);
            setDisplayedText(text);

            // Animate new words
            const spans = scope.current?.querySelectorAll("span.animate-word");
            if (spans) {
                animate(
                    "span.animate-word",
                    {
                        opacity: 1,
                        filter: "blur(0px)",
                    },
                    {
                        duration: 0.25,
                        delay: stagger(0.03, { from: "first", ease: "easeOut" }),
                    }
                ).then(() => {
                    setIsAnimating(false);
                });
            }
        }
    }, [text, displayedText, animate, isAnimating, scope]);

    // Format text with basic markdown-like styling during streaming
    const formatStreamingText = (text: string) => {
        // Split into lines for processing
        const lines = text.split('\n');

        // Track if we're inside a code block
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        let codeBlockLanguage = '';

        // Process lines to identify code blocks first
        type ProcessedLine =
            | { type: 'line'; content: string; }
            | { type: 'codeblock'; content: string[]; language: string; };

        const processedLines: ProcessedLine[] = [];

        // Process consecutive list items to maintain context
        let previousLineWasList = false;
        let listType: 'numbered' | 'bullet' | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Check for code block delimiters (```language or ```)
            if (trimmedLine.startsWith('```')) {
                if (!inCodeBlock) {
                    // Starting a new code block
                    inCodeBlock = true;
                    codeBlockContent = [];
                    // Extract language if specified
                    codeBlockLanguage = trimmedLine.substring(3).trim();
                    previousLineWasList = false;
                    listType = null;
                    continue; // Skip the opening delimiter
                } else {
                    // Ending a code block
                    inCodeBlock = false;
                    // Add the full code block as a single item
                    processedLines.push({
                        type: 'codeblock',
                        content: codeBlockContent,
                        language: codeBlockLanguage
                    });
                    previousLineWasList = false;
                    listType = null;
                    continue; // Skip the closing delimiter
                }
            }

            // If we're inside a code block, collect the content
            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Normal line processing
            processedLines.push({
                type: 'line',
                content: line
            });

            // Track list context for better rendering of consecutive list items
            const isNumberedList = trimmedLine.match(/^\d+\.\s/);
            const isBulletList = trimmedLine.match(/^(\*|\-|\+)\s/);

            if (isNumberedList) {
                previousLineWasList = true;
                listType = 'numbered';
            } else if (isBulletList) {
                previousLineWasList = true;
                listType = 'bullet';
            } else if (trimmedLine === '') {
                // Empty lines don't change list context
            } else {
                previousLineWasList = false;
                listType = null;
            }
        }

        // If we ended with an unclosed code block, add it anyway
        if (inCodeBlock && codeBlockContent.length > 0) {
            processedLines.push({
                type: 'codeblock',
                content: codeBlockContent,
                language: codeBlockLanguage
            });
        }

        return (
            <div ref={scope}>
                {processedLines.map((item, index) => {
                    if (item.type === 'codeblock') {
                        // Use the separate CodeBlock component instead
                        const codeString = item.content.join('\n');
                        return (
                            <CodeBlock
                                key={`codeblock-${index}`}
                                code={codeString}
                                language={item.language}
                            />
                        );
                    }

                    const line = item.content;

                    // Handle empty lines with some minimal spacing
                    if (line.trim() === '') {
                        return <div key={`line-${index}`} className="h-4"></div>;
                    }

                    // Indented code (4 spaces or tab)
                    if (line.match(/^( {4,}|\t)/)) {
                        const codeContent = line.replace(/^( {4,}|\t)/, '');
                        return (
                            <IndentedCode
                                key={`line-${index}`}
                                code={codeContent}
                            />
                        );
                    }

                    // Header detection (# or ## at start of line)
                    if (line.match(/^#{1,6}\s/)) {
                        const level = line.match(/^(#{1,6})\s/)![1].length;
                        const headerText = line.replace(/^#{1,6}\s/, '');

                        let headerClass = "font-bold my-2";
                        if (level === 1) headerClass += " text-2xl";
                        else if (level === 2) headerClass += " text-xl";
                        else if (level === 3) headerClass += " text-lg";

                        // Animate header words
                        const words = headerText.split(' ').filter(word => word.trim() !== '');
                        return (
                            <div key={`line-${index}`} className={headerClass}>
                                {words.map((word: string, idx: number) => (
                                    <motion.span
                                        key={`${idx}-${index}`}
                                        className="animate-word opacity-0 mr-1"
                                        style={{ filter: "blur(8px)" }}
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </div>
                        );
                    }

                    // List item detection
                    if (line.match(/^(\*|\-|\+|\d+\.)\s/)) {
                        const isNumbered = line.match(/^\d+\.\s/);
                        const listMarker = isNumbered
                            ? line.match(/^\d+\./)![0]
                            : '•';
                        const listItemText = line.replace(/^(\*|\-|\+|\d+\.)\s/, '');
                        const words = listItemText.split(' ').filter(word => word.trim() !== '');

                        // Handle empty list items (with just a number/bullet but no content)
                        if (words.length === 0) {
                            return (
                                <div key={`line-${index}`} className="flex items-start my-1">
                                    <div className="mr-2 opacity-75 mt-[2px]">
                                        {listMarker}
                                    </div>
                                    <div className="flex-grow">
                                        <motion.span
                                            className="animate-word opacity-0"
                                            style={{ filter: "blur(8px)" }}
                                        >
                                            &nbsp;
                                        </motion.span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={`line-${index}`} className="flex items-start my-1">
                                <div className="mr-2 opacity-75 mt-[2px] flex-shrink-0 w-6 text-right">
                                    {listMarker}
                                </div>
                                <div className="flex flex-wrap flex-grow">
                                    {words.map((word: string, idx: number) => {
                                        // Check for inline code in list items
                                        if (word.startsWith('`') && word.endsWith('`') && word.length > 2) {
                                            const codeContent = word.slice(1, -1);
                                            return (
                                                <motion.span
                                                    key={`${idx}-${index}`}
                                                    className="animate-word opacity-0 mr-1 px-1.5 py-0.5 bg-slate-800 rounded font-mono text-sm"
                                                    style={{ filter: "blur(8px)" }}
                                                >
                                                    {codeContent}
                                                </motion.span>
                                            );
                                        }

                                        return (
                                            <motion.span
                                                key={`${idx}-${index}`}
                                                className="animate-word opacity-0 mr-1"
                                                style={{ filter: "blur(8px)" }}
                                            >
                                                {word}
                                            </motion.span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // For normal text, apply word-by-word animation with inline code detection
                    const words = line.split(' ');
                    return (
                        <div key={`line-${index}`} className="my-1">
                            {words.map((word: string, idx: number) => {
                                // Detect inline code with backticks
                                if (word.startsWith('`') && word.endsWith('`') && word.length > 2) {
                                    const codeContent = word.slice(1, -1);
                                    return (
                                        <motion.span
                                            key={`${idx}-${index}`}
                                            className="animate-word opacity-0 mr-1 px-1.5 py-0.5 bg-zinc-950 rounded font-mono text-sm"
                                            style={{ filter: "blur(8px)" }}
                                        >
                                            {codeContent}
                                        </motion.span>
                                    );
                                }

                                // Regular word
                                return (
                                    <motion.span
                                        key={`${idx}-${index}`}
                                        className="animate-word opacity-0 mr-1"
                                        style={{ filter: "blur(8px)" }}
                                    >
                                        {word}
                                    </motion.span>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Update final text when streaming completes
    useEffect(() => {
        if (isStreaming) {
            // Reset markdown state when streaming starts
            shouldShowMarkdown.current = false;
        } else if (text) {
            // When streaming ends, store the final text
            setFinalText(text);

            // Add a small delay before showing markdown for smoother transition
            const timer = setTimeout(() => {
                shouldShowMarkdown.current = true;
            }, 400);  // Slightly longer delay for smoother transition

            return () => clearTimeout(timer);
        }
    }, [isStreaming, text]);

    // During streaming, show animated text with a blinking cursor
    if (isStreaming || !shouldShowMarkdown.current) {
        return (
            <div className={cn("relative prose prose-sm prose-invert max-w-none", className)}>
                {/* Animated formatted text during streaming */}
                <div className="whitespace-pre-wrap">
                    {formatStreamingText(text)}
                    {/* Blinking cursor during streaming */}
                    {isStreaming && (
                        <motion.span
                            className="inline-block ml-1 text-blue-400"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        >
                            ▋
                        </motion.span>
                    )}
                </div>
            </div>
        );
    }

    // After streaming finishes, render the markdown
    return (
        <div className={cn("prose prose-sm prose-invert max-w-none", className)}>
            <Markdown>{finalText}</Markdown>
        </div>
    );
}
