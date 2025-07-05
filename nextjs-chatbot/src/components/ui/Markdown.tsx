import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "../ui/CodeBlock";
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

// Enhanced code block component for markdown
const EnhancedMarkdownCodeBlock = ({
  inline,
  className,
  children,
  ...props
}: any) => {
  const [copied, setCopied] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // For inline code
  if (inline) {
    return (
      <code
        className="text-sm py-0.5 px-1.5 rounded-md bg-slate-800/70 text-blue-300 font-medium"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Language display text
  const languageDisplay = language === 'bash' ? 'terminal' : language;

  // For code blocks
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
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components = {
    code: EnhancedMarkdownCodeBlock,
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="list-decimal list-outside ml-4 text-white mb-4 space-y-2" {...props}>
          {children}
        </ol>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="list-disc list-outside ml-4 text-white mb-4 space-y-2" {...props}>
          {children}
        </ul>
      );
    },
    li: ({ node, children, ...props }: any) => {
      return (
        <li className="py-1" {...props}>
          {children}
        </li>
      );
    },
    strong: ({ node, children, ...props }: any) => {
      return (
        <span className="font-semibold text-blue-300" {...props}>
          {children}
        </span>
      );
    },
    blockquote: ({ node, children, ...props }: any) => {
      return (
        <blockquote
          className="border-l-4 border-blue-500/40 pl-4 italic my-4 py-2 text-gray-300 bg-slate-800/20 rounded-r-md"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    h1: ({ node, children, ...props }: any) => {
      return (
        <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-700 text-white" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }: any) => {
      return (
        <h2 className="text-xl font-bold mt-6 mb-3 text-blue-100" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }: any) => {
      return (
        <h3 className="text-lg font-bold mt-5 mb-2 text-blue-200" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ node, children, ...props }: any) => {
      return (
        <h4 className="text-base font-bold mt-4 mb-2 text-blue-300" {...props}>
          {children}
        </h4>
      );
    },
    p: ({ node, children, ...props }: any) => {
      return (
        <p className="text-white mb-4 leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    a: ({ node, children, ...props }: any) => {
      return (
        <a
          className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-400/50 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    hr: ({ node, ...props }: any) => {
      return (
        <hr className="my-6 border-gray-700" {...props} />
      );
    },
    table: ({ node, children, ...props }: any) => {
      return (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full divide-y divide-gray-700 border border-gray-700 rounded-lg overflow-hidden" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead: ({ node, children, ...props }: any) => {
      return (
        <thead className="bg-gray-800" {...props}>
          {children}
        </thead>
      );
    },
    tbody: ({ node, children, ...props }: any) => {
      return (
        <tbody className="divide-y divide-gray-700" {...props}>
          {children}
        </tbody>
      );
    },
    tr: ({ node, children, ...props }: any) => {
      return (
        <tr className="hover:bg-gray-800/50 transition-colors" {...props}>
          {children}
        </tr>
      );
    },
    th: ({ node, children, ...props }: any) => {
      return (
        <th className="px-4 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider" {...props}>
          {children}
        </th>
      );
    },
    td: ({ node, children, ...props }: any) => {
      return (
        <td className="px-4 py-3 text-sm text-gray-300" {...props}>
          {children}
        </td>
      );
    },

    // img: ({ node, children, ...props }: any) => {
    //   return (
    //     <Image className="w-full h-auto" {...props}>
    //       {children}
    //     </Image>
    //   );
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = React.memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
