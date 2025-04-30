import asyncio
import json
import logging
import os
import time
import uuid
from typing import Dict, List, Optional, Any, Union

import httpx
import uvicorn
from opensearchpy import AsyncOpenSearch
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("rag-orchestration-service")


class QueryRequest(BaseModel):
    query: str
    model: str = "llama3"
    stream: bool = False
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None


class QueryResponse(BaseModel):
    query_id: str
    query: str
    response: str
    model: str
    duration_ms: int
    timestamp: int
    metadata: Dict[str, Any] = Field(default_factory=dict)


class OrchestrationService:
    def __init__(
        self,
        ollama_api_url: str,
        opensearch_url: Optional[str] = None,
        opensearch_index: str = "rag-interactions",
        opensearch_username: Optional[str] = None,
        opensearch_password: Optional[str] = None,
        context_builder_url: Optional[str] = None,
    ):
        self.ollama_api_url = ollama_api_url
        self.opensearch_url = opensearch_url
        self.opensearch_index = opensearch_index
        self.opensearch_username = opensearch_username
        self.opensearch_password = opensearch_password
        self.context_builder_url = context_builder_url
        self.client = httpx.AsyncClient(timeout=120.0)
        
        # Initialize OpenSearch client if URL is provided
        self.os_client = None
        if opensearch_url:
            auth = None
            if opensearch_username and opensearch_password:
                auth = (opensearch_username, opensearch_password)
                
            self.os_client = AsyncOpenSearch(
                hosts=[opensearch_url],
                http_auth=auth,
                use_ssl=opensearch_url.startswith("https"),
                verify_certs=False,  # For development; set to True in production with proper certs
                ssl_show_warn=False
            )
        
        # Statistics tracking
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_latency = 0
        self.start_time = time.time()

    async def close(self):
        """Close HTTP client and OpenSearch client connections."""
        await self.client.aclose()
        if self.os_client:
            await self.os_client.close()



    async def log_interaction(
        self, 
        query: str,
        response: str,
        model: str,
        latency_ms: int,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
    # """Log an interaction to OpenSearch."""
        if not self.os_client:
            logger.warning("OpenSearch client not initialized, skipping logging")
            return False
            
        try:
            # Create log document
            log_data = {
                "@timestamp": int(time.time() * 1000),  # OpenSearch timestamp format (milliseconds)
                "query_id": str(uuid.uuid4()),
                "query": query,
                "response": response,
                "model": model,
                "latency_ms": latency_ms,
                "user_id": user_id,
                "session_id": session_id,
                "metadata": metadata or {}
            }
            
            # Ensure the index exists
            if not await self.ensure_opensearch_index():
                logger.error("Failed to ensure index exists before logging")
                return False
                
            # Index the document in OpenSearch
            result = await self.os_client.index(
                index=self.opensearch_index,
                body=log_data,
                refresh=True  # Make document immediately searchable
            )
            
            logger.info(f"Logged interaction to OpenSearch: {result['_id']}")
            return True
        except Exception as e:
            logger.error(f"OpenSearch logging failed: {e}", exc_info=True)
            return False
    
    async def ensure_opensearch_index(self) -> bool:
    #Ensure the OpenSearch index exists with proper mapping.
        if not self.os_client:
            logger.warning("OpenSearch client not initialized, cannot ensure index")
            return False
            
        try:
            # Check if the index exists
            logger.info(f"Checking if index exists: {self.opensearch_index}")
            index_exists = await self.os_client.indices.exists(index=self.opensearch_index)
            logger.info(f"Index exists check result: {index_exists}")
            
            if not index_exists:
                # Define index mapping
                mapping = {
                    "mappings": {
                        "properties": {
                            "@timestamp": {"type": "date"},
                            "query_id": {"type": "keyword"},
                            "query": {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
                            "response": {"type": "text"},
                            "model": {"type": "keyword"},
                            "latency_ms": {"type": "integer"},
                            "user_id": {"type": "keyword"},
                            "session_id": {"type": "keyword"},
                            "metadata": {"type": "object", "dynamic": True}
                        }
                    },
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 1
                    }
                }
                
                # Create the index with mapping
                logger.info(f"Creating index: {self.opensearch_index} with mapping: {mapping}")
                create_result = await self.os_client.indices.create(
                    index=self.opensearch_index,
                    body=mapping
                )
                logger.info(f"Index creation result: {create_result}")
                
                logger.info(f"Created OpenSearch index: {self.opensearch_index}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to ensure OpenSearch index: {e}", exc_info=True)
            return False

    async def get_context(self, query: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get context for a query from the context builder service."""
        if not self.context_builder_url:
            logger.warning("Context builder URL not configured, returning empty context")
            return {"context": "", "metadata": {}, "chunks": []}
            
        try:
            # Prepare request for the context builder
            request_data = {
                "query": query,
                "max_chunks": 5,  # Configure as needed
                "metadata_filter": metadata.get("filter") if metadata else None
            }
            
            # Send request to context builder
            response = await self.client.post(
                f"{self.context_builder_url}/get_context",
                json=request_data
            )
            
            if not response.is_success:
                logger.error(f"Context builder error: {response.text}")
                return {"context": "", "metadata": {}, "chunks": []}
            
            # Parse response - return the entire JSON response, not just the context field
            return response.json()
            
        except Exception as e:
            logger.warning(f"Error getting context: {e}")
            return {"context": "", "metadata": {}, "chunks": []}

    async def process_query(self, request: QueryRequest) -> Dict[str, Any]:
        """Process a user query (non-streaming)."""
        try:
            # Track statistics
            self.total_requests += 1
            start_time = time.time()
            
            # Generate a unique query ID
            query_id = str(uuid.uuid4())
            
            # Get context for the query
            context_data = await self.get_context(request.query, request.metadata)
            
            # Extract text context
            context_text = context_data.get("context", "")
            
            # Extract base64 images from chunks
            base64_images = []
            logger.info(f"Processing {len(context_data.get('chunks', []))} chunks from context provider")
            for chunk in context_data.get("chunks", []):
                if chunk.get("base64"):
                    # Get the base64 data and ensure it's properly formatted for Ollama
                    base64_data = chunk["base64"]
                    # If data has a prefix like "data:image/png;base64,", strip it
                    if isinstance(base64_data, str) and base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    base64_images.append(base64_data)
            
            logger.info(f"Found {len(base64_images)} base64 images to send to Ollama")
            
            # Create a prompt with the context
            prompt = f"""Answer the following question based on the provided image. Please just provide the answer without any additional information. If the image is not relevant, or there is no image, to the question, please say "I don't know".

    Question: {request.query}

    Answer:"""
            
            # Prepare request for the Ollama API
            ollama_request = {
                "model": request.model,
                "prompt": prompt,
                "stream": False,
                "options": request.options or {}
            }
            
            # Add images to the request if available
            if base64_images:
                ollama_request["images"] = base64_images
                logger.info(f"Added {len(base64_images)} images to Ollama request")
            else:
                logger.warning("No images found for multi-modal context!")
            
            # Log the API request format (without the actual image data for brevity)
            log_request = {**ollama_request}
            if "images" in log_request:
                log_request["images"] = f"[{len(log_request['images'])} base64 images]"
            logger.info(f"Sending request to Ollama: {json.dumps(log_request)}")
            
            # Send request to Ollama API
            response = await self.client.post(
                f"{self.ollama_api_url}/api/generate",
                json=ollama_request,
                timeout=120.0  # Increase timeout for image processing
            )
            
            if not response.is_success:
                logger.error(f"Ollama API error: {response.text}")
                self.failed_requests += 1
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Ollama API error: {response.text}"
                )
            
            # Parse response
            response_data = response.json()
            generated_text = response_data.get("response", "")
            
            # Calculate end-to-end latency
            latency_ms = int((time.time() - start_time) * 1000)
            self.total_latency += latency_ms
            self.successful_requests += 1
            
            # Prepare the final response
            result = {
                "query_id": query_id,
                "query": request.query,
                "response": generated_text,
                "model": request.model,
                "duration_ms": latency_ms,
                "timestamp": int(time.time()),
                "metadata": request.metadata or {}
            }
            
            # Log the interaction
            await self.log_interaction(
                query=request.query,
                response=generated_text,
                model=request.model,
                latency_ms=latency_ms,
                user_id=request.user_id,
                session_id=request.session_id,
                metadata=request.metadata
            )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Error processing query: {e}")
            self.failed_requests += 1
            raise HTTPException(
                status_code=500,
                detail=f"Error processing query: {str(e)}"
            )
                

    def get_statistics(self) -> Dict[str, Any]:
        """Get service statistics."""
        uptime_seconds = int(time.time() - self.start_time)
        avg_latency = 0
        if self.successful_requests > 0:
            avg_latency = self.total_latency / self.successful_requests
            
        return {
            "uptime_seconds": uptime_seconds,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": self.successful_requests / max(1, self.total_requests),
            "avg_latency_ms": avg_latency,
            "requests_per_second": self.total_requests / max(1, uptime_seconds)
        }


# Create FastAPI app
app = FastAPI(
    title="RAG Orchestration Service",
    description="Orchestration service for RAG application",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service configuration from environment
ollama_api_url = os.getenv("OLLAMA_API_URL", "http://localhost:8000")
opensearch_url = os.getenv("OPENSEARCH_URL")
opensearch_index = os.getenv("OPENSEARCH_INDEX", "rag-interactions")
opensearch_username = os.getenv("OPENSEARCH_USERNAME")
opensearch_password = os.getenv("OPENSEARCH_PASSWORD")
context_builder_url = os.getenv("CONTEXT_BUILDER_URL")

# Create orchestration service
service = OrchestrationService(
    ollama_api_url=ollama_api_url,
    opensearch_url=opensearch_url,
    opensearch_index=opensearch_index,
    opensearch_username=opensearch_username,
    opensearch_password=opensearch_password,
    context_builder_url=context_builder_url,
)


@app.on_event("startup")
async def startup_event():
    """Start up event handler."""
    logger.info(f"Orchestration service starting, connected to Ollama API at {ollama_api_url}")
    
    # Ensure OpenSearch index exists
    if service.os_client:
        await service.ensure_opensearch_index()


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    await service.close()


@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "RAG Orchestration Service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    # Get Ollama API health
    try:
        ollama_health = await service.client.get(f"{ollama_api_url}/health")
        ollama_status = "healthy" if ollama_health.is_success else "unhealthy"
    except Exception:
        ollama_status = "unavailable"
    
    # Get OpenSearch health if configured
    opensearch_status = "not_configured"
    if service.os_client:
        try:
            os_health = await service.os_client.cluster.health()
            opensearch_status = os_health["status"]  # green, yellow, or red
        except Exception as e:
            opensearch_status = "unavailable"
            logger.error(f"OpenSearch health check failed: {e}")
    
    # Get cache health if configured
    cache_status = "not_configured"
    
    # Get context builder health if configured
    context_status = "not_configured"
    if context_builder_url:
        try:
            context_health = await service.client.get(f"{context_builder_url}/health")
            context_status = "healthy" if context_health.is_success else "unhealthy"
        except Exception:
            context_status = "unavailable"
    
    # Get service statistics
    stats = service.get_statistics()
    
    return {
        "status": "healthy",
        "ollama_api": ollama_status,
        "opensearch": opensearch_status,
        "cache": cache_status,
        "context_builder": context_status,
        "statistics": stats,
    }


@app.get("/statistics")
async def statistics():
    """Get service statistics."""
    return service.get_statistics()


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Process a non-streaming query."""
    if request.stream:
        raise HTTPException(
            status_code=400,
            detail="For streaming requests, use the /query/stream endpoint"
        )
    
    return await service.process_query(request)


@app.post("/query/stream")
async def query_stream(request: QueryRequest):
    """Process a streaming query."""
    # Force streaming for this endpoint
    request.stream = True
    return await service.process_streaming_query(request)


@app.get("/models")
async def list_models():
    """List available models from Ollama API."""
    try:
        response = await service.client.get(f"{ollama_api_url}/models")
        return response.json()
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving models: {str(e)}"
        )


if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", "9000"))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)