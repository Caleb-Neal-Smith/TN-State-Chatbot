'use client';
// components/_components/chat/MessageRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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
    >
      {content}
    </ReactMarkdown>
  );
}