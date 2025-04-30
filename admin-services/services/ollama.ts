// services/ollama.ts
interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
  }
  
  // Default Ollama model
  const DEFAULT_MODEL = 'gemma3:4b-it-qat';
  
  // Function to get the Ollama API URL from environment variables
  export function getOllamaApiUrl(): string {
    const url = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
  
  // Function to generate a completion from Ollama
  export async function generateCompletion(
    prompt: string,
    model: string = DEFAULT_MODEL,
    options: Record<string, any> = {}
  ): Promise<OllamaResponse> {
    const apiUrl = `${getOllamaApiUrl()}/api/generate`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...options,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }
  
  // Function to stream a completion from Ollama
  export async function streamCompletion(
    prompt: string,
    model: string = DEFAULT_MODEL,
    options: Record<string, any> = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const apiUrl = `${getOllamaApiUrl()}/api/generate`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        ...options,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }
    
    return response.body as ReadableStream<Uint8Array>;
  }
  
  // Function to list available models
  export async function listModels(): Promise<{ models: Array<{ name: string }> }> {
    const apiUrl = `${getOllamaApiUrl()}/api/tags`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }