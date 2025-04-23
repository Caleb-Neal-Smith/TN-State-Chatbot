'use client';
// components/_components/chat/ChatMessage.tsx
import React from 'react';
import { User, Bot } from 'lucide-react';
import MessageRenderer from './MessageRenderer';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-white" />
        </div>
      )}
      
      <div className={`
        flex-1 max-w-3xl p-4 rounded-lg
        ${isUser 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-gray-100 text-gray-800 rounded-tl-none'}
      `}>
        <MessageRenderer content={content} isUser={isUser} />
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-white" />
        </div>
      )}
    </div>
  );
}