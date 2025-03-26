// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion, streamCompletion } from '@/services/ollama';
import { Readable } from 'stream';

// Helper to convert a ReadableStream to a Node.js Readable stream
function readableStreamToNodeStream(readableStream: ReadableStream<Uint8Array>): Readable {
  const reader = readableStream.getReader();
  const nodeStream = new Readable({
    read() {
      reader.read().then(
        ({ value, done }) => {
          if (done) {
            this.push(null);
            return;
          }
          this.push(value);
        },
        (error) => {
          this.destroy(error);
        }
      );
    },
  });
  
  return nodeStream;
}

// Non-streaming handler
export async function POST(req: NextRequest) {
  try {
    const { message, model = 'llama3.2', stream = true } = await req.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    if (stream) {
      // Handle streaming response
      const ollamaStream = await streamCompletion(message, model);
      
      // Create a TransformStream to process the Ollama chunks
      const transformStream = new TransformStream({
        transform: async (chunk, controller) => {
          // Parse the chunk as a string
          const text = new TextDecoder().decode(chunk);
          
          // Process each line (Ollama sends newline-delimited JSON)
          const lines = text.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            try {
              const parsedChunk = JSON.parse(line);
              // Just send the response text
              controller.enqueue(parsedChunk.response);
            } catch (e) {
              console.error('Error parsing JSON from Ollama:', e);
            }
          }
        },
      });
      
      // Pipe the Ollama stream through our transform stream
      const responseStream = ollamaStream.pipeThrough(transformStream);
      
      // Return the stream as an event stream
      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Handle non-streaming response
      const result = await generateCompletion(message, model);
      
      return NextResponse.json({
        response: result.response,
        model: result.model,
      });
    }
  } catch (error) {
    console.error('Error in chat API route:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}