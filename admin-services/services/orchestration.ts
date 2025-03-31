// services/orchestration.ts
interface QueryRequest {
    query: string;
    model: string;
    stream: boolean;
    user_id?: string;
    session_id?: string;
    metadata?: Record<string, any>;
    options?: Record<string, any>;
  }
  
  interface QueryResponse {
    query_id: string;
    query: string;
    response: string;
    model: string;
    duration_ms: number;
    timestamp: number;
    metadata: Record<string, any>;
  }
  
  // Function to get the Orchestration Service URL from environment variables
  export function getOrchestrationServiceUrl(): string {
    const url = process.env.ORCHESTRATION_SERVICE_URL || 'http://localhost:9000';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
  
  // Helper function to add timeout to fetch
  async function fetchWithTimeout(
    url: string, 
    options: RequestInit,
    timeout = 60000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
  
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  // Function to generate a completion from the Orchestration Service
  export async function generateCompletion(
    query: string,
    model: string = 'llama3.2',
    options: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<QueryResponse> {
    const apiUrl = `${getOrchestrationServiceUrl()}/query`;
    
    const requestBody: QueryRequest = {
      query,
      model,
      stream: false,
      metadata,
      options
    };
    
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        30000 // 30 second timeout
      );
      
      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || `HTTP error ${response.status}`;
        } catch (e) {
          errorMessage = await response.text() || `HTTP error ${response.status}`;
        }
        throw new Error(`Orchestration Service error: ${errorMessage}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error calling orchestration service:", error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to orchestration service timed out');
      }
      throw error;
    }
  }
  
  // Function to stream a completion from the Orchestration Service
  export async function streamCompletion(
    query: string,
    model: string = 'llama3.2',
    options: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<ReadableStream<Uint8Array>> {
    // WARNING: This approach works around streaming issues in the orchestration service
    // by using a non-streaming request but delivering it as a stream
    console.log("Using fallback non-streaming method to avoid connection issues");
    
    try {
      // Use non-streaming request
      const result = await generateCompletion(query, model, options, metadata);
      
      // Create a readable stream from the response text
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send the content as a single chunk with proper SSE format
          controller.enqueue(encoder.encode(`data: ${result.response}\n\n`));
          // End the stream
          controller.close();
        }
      });
      
      return stream;
    } catch (error) {
      console.error("Error creating simulated stream:", error);
      
      // Create an error stream
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during streaming';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      });
      
      return errorStream;
    }
  }
  
  // Function to list available models
  export async function listModels(): Promise<string[]> {
    const apiUrl = `${getOrchestrationServiceUrl()}/models`;
    
    try {
      const response = await fetchWithTimeout(
        apiUrl,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        5000 // 5 second timeout
      );
      
      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || `HTTP error ${response.status}`;
        } catch (e) {
          errorMessage = await response.text() || `HTTP error ${response.status}`;
        }
        throw new Error(`Error fetching models: ${errorMessage}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error("Error fetching models:", error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request to fetch models timed out');
      }
      throw error;
    }
  }