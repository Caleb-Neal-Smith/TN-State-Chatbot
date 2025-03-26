'use client';
// hooks/useChat.ts
import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  async function sendMessage(content: string) {
    setError(null);
    
    // Add user message immediately
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Make the API call - uses Next.js API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }
      
      // Check if the response is a stream
      const isStream = response.headers.get('Content-Type')?.includes('text/event-stream');
      
      if (isStream) {
        // Create empty assistant message
        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Process the stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        // Continue reading the stream until done
        if (reader) {
          let done = false;
          let accumulatedContent = '';
          
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
              // Decode the chunk and add it to accumulated content
              const chunk = decoder.decode(value, { stream: true });
              accumulatedContent += chunk;
              
              // Update the assistant message with accumulated content
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = accumulatedContent;
                return newMessages;
              });
            }
          }
        }
      } else {
        // Handle non-streaming response
        const data = await response.json();
        const assistantMessage: Message = { role: 'assistant', content: data.response };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while sending the message');
    } finally {
      setIsLoading(false);
    }
  }
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}