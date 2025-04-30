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

interface HealthStatus {
  status: string;
  ollama_api: string;
  opensearch: string;
  cache: string;
  context_builder: string;
  statistics: Record<string, any>;
}

interface OllamaHealth {
  status: string;
  total_instances: number;
  healthy_instances: number;
  instances: {
    url: string;
    healthy: boolean;
    active_connections: number;
    total_requests: number;
    models: any[];
  }[];
}

interface Statistics {
  uptime_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  requests_per_second: number;
}

interface ModelsResponse {
  models: string[];
}

// Function to get the Orchestration Service URL from environment variables
export function getOrchestrationServiceUrl(): string {
  // Use environment variable which will be set to the Docker service name in production
  const url = process.env.ORCHESTRATION_SERVICE_URL || 'http://orchestration-service:9000';
  console.log("Using orchestration service URL:", url);
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Function to get the Ollama API URL
export function getOllamaApiUrl(): string {
  // In Docker, should reference the service name
  const url = process.env.OLLAMA_API_URL || 'http://ollama-api-server:8100';
  console.log("Using Ollama API URL:", url);
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
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    console.log(`Response status from ${url}: ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Function to generate a completion from the Orchestration Service
export async function generateCompletion(
  query: string,
  model: string = 'gemma3:4b-it-qat',
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
  model: string = 'gemma3:4b-it-qat',
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

// Function to get health status of services
export async function getHealthStatus(): Promise<{ orchestration: HealthStatus; ollama: OllamaHealth }> {
  try {
    const orchUrl = `${getOrchestrationServiceUrl()}/health`;
    console.log(`Fetching orchestration health from: ${orchUrl}`);
    
    // Get orchestration health status
    const orchResponse = await fetchWithTimeout(
      orchUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      5000
    );
    
    if (!orchResponse.ok) {
      console.error(`Failed to fetch orchestration health: ${orchResponse.statusText}`);
      throw new Error(`Failed to fetch orchestration health: ${orchResponse.statusText}`);
    }
    
    const orchestrationData = await orchResponse.json();
    
    // Only proceed with Ollama health if orchestration succeeded
    const ollamaUrl = `${getOllamaApiUrl()}/health`;
    console.log(`Fetching Ollama health from: ${ollamaUrl}`);
    
    try {
      // Get Ollama API health status
      const ollamaResponse = await fetchWithTimeout(
        ollamaUrl,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        5000
      );
      
      if (ollamaResponse.ok) {
        const ollamaData = await ollamaResponse.json();
        return {
          orchestration: orchestrationData,
          ollama: ollamaData
        };
      } else {
        console.warn(`Ollama health check failed with status: ${ollamaResponse.status}`);
        return {
          orchestration: orchestrationData,
          ollama: {
            status: 'unhealthy',
            total_instances: 0,
            healthy_instances: 0,
            instances: []
          }
        };
      }
    } catch (ollamaError) {
      console.warn("Error fetching Ollama health status:", ollamaError);
      return {
        orchestration: orchestrationData,
        ollama: {
          status: 'unavailable',
          total_instances: 0,
          healthy_instances: 0,
          instances: []
        }
      };
    }
  } catch (error) {
    console.error("Error fetching health status:", error);
    // Return fallback data when services are unreachable
    return {
      orchestration: {
        status: 'unavailable',
        ollama_api: 'unavailable',
        opensearch: 'unavailable',
        cache: 'unavailable',
        context_builder: 'unavailable',
        statistics: {}
      },
      ollama: {
        status: 'unavailable',
        total_instances: 0,
        healthy_instances: 0,
        instances: []
      }
    };
  }
}

// Function to get statistics from orchestration service
export async function getStatistics(): Promise<Statistics> {
  const apiUrl = `${getOrchestrationServiceUrl()}/statistics`;
  
  try {
    const response = await fetchWithTimeout(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      5000
    );
    
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.detail || `HTTP error ${response.status}`;
      } catch (e) {
        errorMessage = await response.text() || `HTTP error ${response.status}`;
      }
      throw new Error(`Error fetching statistics: ${errorMessage}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching statistics:", error);
    // Return fallback data when service is unreachable
    return {
      uptime_seconds: 0,
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      success_rate: 0,
      avg_latency_ms: 0,
      requests_per_second: 0
    };
  }
}

// Create orchestration service object for API endpoint
export const orchestrationService = {
  query: async (query: string, options: any = {}) => {
    return generateCompletion(query, options.model, options.options, options.metadata);
  },
  async getHealthStatus() {
    try {
      return await getHealthStatus();
    } catch (error) {
      console.error("Error in orchestrationService.getHealthStatus:", error);
      // Return fallback data
      return {
        orchestration: {
          status: 'error',
          ollama_api: 'error',
          opensearch: 'error',
          cache: 'error',
          context_builder: 'error',
          statistics: {}
        },
        ollama: {
          status: 'error',
          total_instances: 0,
          healthy_instances: 0,
          instances: []
        }
      };
    }
  },
  async getStatistics() {
    try {
      return await getStatistics();
    } catch (error) {
      console.error("Error in orchestrationService.getStatistics:", error);
      // Return fallback data
      return {
        uptime_seconds: 0,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        requests_per_second: 0
      };
    }
  },
  async getModels() {
    try {
      const models = await listModels();
      return { models };
    } catch (error) {
      console.error("Error in orchestrationService.getModels:", error);
      return { models: [] };
    }
  }
};