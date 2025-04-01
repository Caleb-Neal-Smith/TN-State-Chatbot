'use client';
// components/_components/chat/ChatInput.tsx
import React, { useState, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { EditorContent } from '@tiptap/react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [messageText, setMessageText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Enter your message...',
      }),
    ],
    onUpdate: ({ editor }) => {
      setMessageText(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'p-3 w-full outline-none min-h-[80px] max-h-[300px] overflow-y-auto prose prose-sm',
      },
    },
  });

  useEffect(() => {
    // Focus the editor when component mounts
    if (editor) {
      setTimeout(() => editor.commands.focus(), 0);
    }
  }, [editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || isLoading) return;
    
    onSendMessage(messageText.trim());
    
    // Reset the editor
    if (editor) {
      editor.commands.setContent('');
    }
    
    setMessageText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="border rounded-lg overflow-hidden bg-white">
        {editor && (
          <div 
            className="prose-sm"
            onKeyDown={handleKeyDown}
          >
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-2">
        <button
          type="button"
          onClick={() => editor?.commands.clearContent()}
          className="p-2 text-gray-500 hover:text-gray-700 rounded"
        >
          <RotateCcw size={16} />
        </button>
        
        <button
          type="submit"
          disabled={!messageText.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Send</span>
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}