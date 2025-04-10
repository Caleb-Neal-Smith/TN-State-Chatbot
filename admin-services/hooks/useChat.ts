'use client';
// lib/hooks/useChat.ts
import { useState, useCallback, useRef } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to handle errors during streaming
  const handleStreamError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);

    // Update the last message if it was an assistant message that was interrupted
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        // If the last message was empty, remove it
        if (!lastMessage.content.trim()) {
          return prev.slice(0, -1);
        }
        // Otherwise append error notice to it
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}\n\n_[Connection error: Message may be incomplete]_`,
        };
        return updatedMessages;
      }
      return prev;
    });
  }, []);

  // Function to cancel ongoing requests
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Cancel any ongoing request
    cancelRequest();

    // Clear any previous errors
    setError(null);

    // Add user message immediately
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    // Set loading state
    setIsLoading(true);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Make the API call - uses Next.js API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content, 
          model: selectedModel
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP error ${response.status}`;
        } catch (e) {
          errorMessage = await response.text() || `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Create empty assistant message
      const assistantMessage: Message = { role: 'assistant', content: '' };

      // Process the stream using a simpler approach
      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('No response body received');
      }

      // Create empty assistant message immediately
      setMessages(prev => [...prev, assistantMessage]);

      // Read the stream chunks with error handling
      try {
        const decoder = new TextDecoder();
        let buffer = '';

        // Read chunks from the stream
        let chunkCount = 0;
        while (true) {
          try {
            const { value, done } = await reader.read();

            if (done) {
              // Stream is complete
              break;
            }

            // Decode the chunk
            const text = decoder.decode(value, { stream: true });
            buffer += text;

            // Process complete lines (SSE format: "data: content\n\n")
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep the last incomplete chunk

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data:')) {
                // Extract the content part
                const data = trimmedLine.slice(5).trim();

                try {
                  // Try to parse as JSON first
                  const parsedData = JSON.parse(data);
                  if (parsedData.error) {
                    throw new Error(parsedData.error);
                  }
                  // Update with either the response field or the raw data
                  updateAssistantMessage(parsedData.response || data);
                } catch (e) {
                  // If not JSON, use as plain text
                  if (!(e instanceof SyntaxError)) {
                    throw e; // Re-throw non-JSON parsing errors
                  }
                  updateAssistantMessage(data);
                }
              } else if (trimmedLine) {
                // Handle plain text that doesn't follow SSE format
                updateAssistantMessage(trimmedLine);
              }
            }

            // Safety mechanism - break if we've processed a lot of chunks
            // This avoids infinite loops if the stream never completes properly
            chunkCount++;
            if (chunkCount > 1000) {
              console.warn('Too many chunks processed, breaking stream read loop');
              break;
            }
          } catch (readError) {
            // Handle chunk reading errors
            if (readError instanceof Error && readError.name === 'AbortError') {
              console.log('Stream reading aborted');
              break;
            }
            console.error('Error reading stream chunk:', readError);
            throw readError;
          }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
          const trimmedBuffer = buffer.trim();
          if (trimmedBuffer.startsWith('data:')) {
            updateAssistantMessage(trimmedBuffer.slice(5).trim());
          } else if (trimmedBuffer) {
            updateAssistantMessage(trimmedBuffer);
          }
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          // Request was aborted - don't set an error
          return;
        }

        // Handle streaming errors
        handleStreamError(streamError instanceof Error ? streamError.message : 'Stream error');
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted - don't set an error
        return;
      }

      // Handle other errors
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while sending the message');

      // Remove the assistant message if it was added but empty
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content.trim()) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [handleStreamError, cancelRequest, selectedModel]);

  // Helper function to update the assistant's message content
  const updateAssistantMessage = useCallback((newContent: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + newContent,
        };
        return updatedMessages;
      } else {
        // Only create a new message if there isn't already an assistant message
        return [...prev, { role: 'assistant', content: newContent }];
      }
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    cancelRequest,
    selectedModel,
    setSelectedModel
  };
}