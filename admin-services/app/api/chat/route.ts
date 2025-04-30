// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/services/orchestration';
import { nanoid } from 'nanoid';

// Explicitly opt out of edge runtime to use Node.js streams
export const config = {
  runtime: 'nodejs',
};

export async function POST(req: NextRequest) {
  try {
    const { message, model = 'gemma3:4b-it-qat', stream = true, options = {} } = await req.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Generate a session ID if not provided
    const sessionId = req.cookies.get('session_id')?.value || nanoid();
    
    // Add metadata for tracking
    const metadata = {
      source: 'admin_ui',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      session_id: sessionId,
    };
    
    if (stream) {
      try {
        // Handle non-streaming response but return it as a "fake stream"
        // This avoids the streaming errors from the orchestration service
        const result = await generateCompletion(message, model, options, metadata);
        
        // Create a readable stream from the response
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            // Send the response as a single chunk
            controller.enqueue(encoder.encode(`data: ${result.response}\n\n`));
            // End the stream
            controller.close();
          }
        });
        
        // Return the stream
        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        });
      } catch (error) {
        console.error('Error in streaming mode:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Unknown error during streaming' },
          { status: 500 }
        );
      }
    } else {
      // Handle non-streaming response
      try {
        const result = await generateCompletion(message, model, options, metadata);
        
        // Create response with session cookie
        const response = NextResponse.json({
          response: result.response,
          model: result.model,
          query_id: result.query_id,
        });
        
        // Set session cookie
        response.cookies.set('session_id', sessionId, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict',
        });
        
        return response;
      } catch (error) {
        console.error('Error in non-streaming mode:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Unknown error during query' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('General API route error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}