import React, { useState } from "react";

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || "");
  const codeContent = String(children).replace(/\n$/, "");

  if (!inline) {
    return (
      <pre
        {...props}
        className={`text-sm w-full overflow-x-auto bg-zinc-950 p-4 rounded-xl text-white`}
      >
        <code className="whitespace-pre-wrap break-words">{codeContent}</code>
      </pre>
    );
  } else {
    return (
      <code
        className={`${className} text-sm py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}