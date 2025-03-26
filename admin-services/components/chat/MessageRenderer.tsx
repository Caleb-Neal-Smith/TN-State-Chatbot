'use client';
// components/_components/chat/MessageRenderer.tsx
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageRendererProps {
  content: string;
  isUser: boolean;
}

export default function MessageRenderer({ content, isUser }: MessageRendererProps) {
  // For user messages, we'll just display the text as is
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
  
  // For assistant messages, we'll render markdown with code highlighting
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // Style table elements for better readability
        table({ node, ...props }) {
          return (
            <div className="overflow-x-auto">
              <table className="border-collapse border border-gray-300 my-4" {...props} />
            </div>
          );
        },
        tr({ node, ...props }) {
          return <tr className="border-b border-gray-300" {...props} />;
        },
        th({ node, ...props }) {
          return <th className="border border-gray-300 px-4 py-2 bg-gray-100" {...props} />;
        },
        td({ node, ...props }) {
          return <td className="border border-gray-300 px-4 py-2" {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}