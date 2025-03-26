'use client';
// components/_components/chat/ChatInterface.tsx
import React, { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingIndicator from './LoadingIndicator';

export default function ChatInterface() {
  const { messages, isLoading, sendMessage, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat messages container with fixed height and scrolling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <div className="max-w-md">
              <h3 className="text-2xl font-semibold mb-2">Chat with Ollama</h3>
              <p>Send a message to start chatting with the LLM.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                role={message.role} 
                content={message.content} 
              />
            ))}
          </>
        )}
        
        {isLoading && (
          <div className="py-2">
            <LoadingIndicator />
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            Error: {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat input fixed at the bottom */}
      <div className="border-t p-4">
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}