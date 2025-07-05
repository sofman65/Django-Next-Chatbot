"use client";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Check, Copy, Terminal } from "lucide-react";

type CodeBlockProps = {
    language: string;
    filename: string;
    highlightLines?: number[];
} & (
        | {
            code: string;
            tabs?: never;
        }
        | {
            code?: never;
            tabs: Array<{
                name: string;
                code: string;
                language?: string;
                highlightLines?: number[];
            }>;
        }
    );

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

export const EnhancedCodeBlock = ({
    language,
    filename,
    code,
    highlightLines = [],
    tabs = [],
}: CodeBlockProps) => {
    const [copied, setCopied] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState(0);
    const [isHovered, setIsHovered] = React.useState(false);

    const tabsExist = tabs.length > 0;

    const copyToClipboard = async () => {
        const textToCopy = tabsExist ? tabs[activeTab].code : code;
        if (textToCopy) {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const activeCode = tabsExist ? tabs[activeTab].code : code;
    const activeLanguage = tabsExist
        ? tabs[activeTab].language || language
        : language;
    const activeHighlightLines = tabsExist
        ? tabs[activeTab].highlightLines || []
        : highlightLines;

    // Language display text
    const languageDisplay = activeLanguage === 'bash' ? 'terminal' : activeLanguage;

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
            {/* Header bar with filename/language and copy button */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800/50 bg-gray-900/95">
                <div className="flex items-center gap-2">
                    {activeLanguage === 'bash' ? (
                        <Terminal size={14} className="text-teal-400" />
                    ) : (
                        <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-teal-500" />
                    )}
                    <span className="text-xs font-medium text-gray-300">
                        {filename || languageDisplay}
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

            {/* Tabs if they exist */}
            {tabsExist && (
                <div className="flex overflow-x-auto bg-gray-900/95 border-b border-gray-800/50">
                    {tabs.map((tab, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveTab(index)}
                            className={`px-4 py-2 text-xs transition-colors font-sans border-b-2 ${activeTab === index
                                    ? "text-white border-gradient-to-r from-blue-500 to-teal-500 bg-gray-800/30"
                                    : "text-gray-400 hover:text-gray-200 border-transparent"
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Code content */}
            <div className="bg-gray-900/95 p-4 overflow-x-auto">
                <SyntaxHighlighter
                    language={activeLanguage}
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
                            backgroundColor: activeHighlightLines.includes(lineNumber)
                                ? "rgba(37, 99, 235, 0.1)"
                                : "transparent",
                            display: "block",
                            width: "100%",
                            borderLeft: activeHighlightLines.includes(lineNumber)
                                ? "2px solid rgba(37, 99, 235, 0.5)"
                                : "none",
                            paddingLeft: activeHighlightLines.includes(lineNumber) ? "0.5rem" : "0",
                        },
                    })}
                    PreTag="div"
                >
                    {String(activeCode)}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};
