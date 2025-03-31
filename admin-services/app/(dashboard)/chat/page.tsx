// app/chat/page.tsx
import React from 'react';
import { Metadata } from 'next';
import ChatInterface from '@/components/chat/ChatInterface';

export const metadata: Metadata = {
  title: 'RAG Chat Interface',
  description: 'Chat with Ollama LLM',
};

// This is a Server Component - leveraging SSR
export default async function ChatPage() {
  return (
    <div className="flex flex-col h-dvh">
      <main className="flex-grow overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}