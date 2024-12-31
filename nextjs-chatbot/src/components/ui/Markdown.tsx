import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "../ui/CodeBlock";

export const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      return (
        <CodeBlock node={node} inline={inline} className={className} {...props}>
          {children}
        </CodeBlock>
      );
    },
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="list-decimal list-inside ml-4 text-black" {...props}>
          {children}
        </ol>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="list-disc list-inside ml-4 text-black" {...props}>
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
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    blockquote: ({ node, children, ...props }: any) => {
      return (
        <blockquote
          className="border-l-4 border-gray-300 pl-4 italic"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    h1: ({ node, children, ...props }: any) => {
      return (
        <h1 className="text-2xl font-bold" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }: any) => {
      return (
        <h2 className="text-xl font-bold" {...props}>
          {children}
        </h2>
      );
    },
    // Add more heading levels as needed
    p: ({ node, children, ...props }: any) => {
      return (
        <p className="text-black" {...props}>
          {children}
        </p>
      );
    },
    a: ({ node, children, ...props }: any) => {
      return (
        <a className="text-blue-500" {...props}>
          {children}
        </a>
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
