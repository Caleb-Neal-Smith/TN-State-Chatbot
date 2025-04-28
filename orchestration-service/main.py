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
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, Query
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


class LogSearchRequest(BaseModel):
    query: Optional[str] = None
    model: Optional[str] = None
    from_timestamp: Optional[int] = None
    to_timestamp: Optional[int] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    page: int = 1
    limit: int = 20
    sort_field: str = "timestamp"
    sort_order: str = "desc"


class LogEntry(BaseModel):
    query_id: str
    query: str
    response: str
    model: str
    latency_ms: int
    timestamp: int
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LogsResponse(BaseModel):
    logs: List[LogEntry]
    total: int
    page: int
    limit: int


class OrchestrationService:
    def __init__(
        self,
        ollama_api_url: str,
        opensearch_url: Optional[str] = None,
        opensearch_index: str = "rag-interactions",
        opensearch_username: Optional[str] = None,
        opensearch_password: Optional[str] = None,
        cache_url: Optional[str] = None,
        context_builder_url: Optional[str] = None,
    ):
        self.ollama_api_url = ollama_api_url
        self.opensearch_url = opensearch_url
        self.opensearch_index = opensearch_index
        self.opensearch_username = opensearch_username
        self.opensearch_password = opensearch_password
        self.cache_url = cache_url
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

    async def check_cache(self, query: str) -> Optional[Dict[str, Any]]:
        """Check if a response for the given query exists in the cache."""
        if not self.cache_url:
            return None
            
        try:
            # Cache key should consider relevant factors that determine the response
            cache_key = hash(query)
            response = await self.client.get(
                f"{self.cache_url}/get", 
                params={"key": cache_key}
            )
            
            if response.status_code == 200:
                return response.json()
            
            return None
        except Exception as e:
            logger.warning(f"Cache check failed: {e}")
            return None

    async def store_in_cache(self, query: str, response_data: Dict[str, Any]) -> bool:
        """Store a query/response pair in the cache."""
        if not self.cache_url:
            return False
            
        try:
            # Cache key should consider relevant factors that determine the response
            cache_key = hash(query)
            response = await self.client.post(
                f"{self.cache_url}/set", 
                json={
                    "key": cache_key,
                    "value": response_data,
                    "ttl": 3600  # 1 hour TTL by default
                }
            )
            
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Cache store failed: {e}")
            return False

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
        """Log an interaction to OpenSearch."""
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
        """Ensure the OpenSearch index exists with proper mapping."""
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

    async def process_query(self, request: QueryRequest) -> Dict[str, Any]:
        """Process a user query (non-streaming)."""
        try:
            # Track statistics
            self.total_requests += 1
            start_time = time.time()
            
            # Generate a unique query ID
            query_id = str(uuid.uuid4())
            
            # Check cache first if available
            cached_response = await self.check_cache(request.query)
            if cached_response:
                logger.info(f"Cache hit for query: {request.query[:50]}...")
                self.successful_requests += 1
                
                # Still log this interaction as a cache hit
                await self.log_interaction(
                    query=request.query,
                    response=cached_response["response"],
                    model=request.model,
                    latency_ms=int((time.time() - start_time) * 1000),
                    user_id=request.user_id,
                    session_id=request.session_id,
                    metadata={
                        **(request.metadata or {}),
                        "cache_hit": True
                    }
                )
                
                return {
                    "query_id": query_id,
                    "query": request.query,
                    "response": cached_response["response"],
                    "model": request.model,
                    "duration_ms": int((time.time() - start_time) * 1000),
                    "timestamp": int(time.time()),
                    "metadata": {
                        "cache_hit": True,
                        **(request.metadata or {})
                    }
                }
            
            # Prepare request for the Ollama API
            ollama_request = {
                "model": request.model,
                "prompt": request.query,
                "stream": False,
                "options": request.options or {}
            }
            
            # Send request to Ollama API
            response = await self.client.post(
                f"{self.ollama_api_url}/api/generate",
                json=ollama_request
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
            
            # Store in cache
            await self.store_in_cache(request.query, result)
            
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

<<<<<<< Updated upstream
    async def process_streaming_query(self, request: QueryRequest):
        """Process a streaming user query."""
        try:
            # Track statistics
            self.total_requests += 1
            start_time = time.time()
            
            # Generate a unique query ID
            query_id = str(uuid.uuid4())
            
            # Prepare request for the Ollama API
            ollama_request = {
                "model": request.model,
                "prompt": request.query,
                "stream": True,
                "options": request.options or {}
            }
            
            # For collecting the complete response for logging
            complete_response = []
            
            async def process_stream():
                try:
                    async with self.client.stream(
                        "POST",
                        f"{self.ollama_api_url}/api/generate/stream",
                        json=ollama_request,
                        timeout=300.0
                    ) as response:
                        if not response.is_success:
                            error_text = await response.aread()
                            self.failed_requests += 1
                            raise HTTPException(
                                status_code=response.status_code,
                                detail=error_text.decode()
                            )
                        
                        async for chunk in response.aiter_text():
                            # Parse the chunk and collect response for logging
                            try:
                                data = json.loads(chunk)
                                if "response" in data:
                                    text = data.get("response", "")
                                    complete_response.append(text)
                            except:
                                pass
                            
                            # Stream the chunk to the client
                            yield chunk
                    
                    # Log the interaction once streaming completes
                    latency_ms = int((time.time() - start_time) * 1000)
                    self.total_latency += latency_ms
                    self.successful_requests += 1
                    
                    full_response = "".join(complete_response)
                    
                    await self.log_interaction(
                        query=request.query,
                        response=full_response,
                        model=request.model,
                        latency_ms=latency_ms,
                        user_id=request.user_id,
                        session_id=request.session_id,
                        metadata=request.metadata
                    )
                    
                    # Also store in cache for future non-streaming requests
                    result = {
                        "query_id": query_id,
                        "query": request.query,
                        "response": full_response,
                        "model": request.model,
                        "duration_ms": latency_ms,
                        "timestamp": int(time.time()),
                        "metadata": request.metadata or {}
                    }
                    await self.store_in_cache(request.query, result)
                    
                except HTTPException:
                    raise
                except Exception as e:
                    logger.exception(f"Stream processing error: {e}")
                    self.failed_requests += 1
                    # We need to yield an error in SSE format
                    yield json.dumps({"error": str(e)})
            
            return StreamingResponse(
                process_stream(),
                media_type="text/event-stream"
            )
            
        except Exception as e:
            logger.exception(f"Error setting up streaming: {e}")
            self.failed_requests += 1
            raise HTTPException(
                status_code=500,
                detail=f"Error setting up streaming: {str(e)}"
=======
    async def get_logs(
    self,
        page: int = 1,
        limit: int = 20,
        search_query: Optional[str] = None,
        model: Optional[str] = None,
        from_timestamp: Optional[int] = None,
        to_timestamp: Optional[int] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        sort_field: str = "@timestamp",  # Changed default from "timestamp" to "@timestamp"
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get logs from OpenSearch with pagination and filters."""
        if not self.os_client:
            logger.warning("OpenSearch client not initialized, cannot get logs")
            raise HTTPException(
                status_code=500,
                detail="OpenSearch client not initialized"
            )
            
        try:
            # Calculate offset for pagination
            offset = (page - 1) * limit
            
            # Build query
            must_conditions = []
            
            # Add search query if provided
            if search_query:
                must_conditions.append({
                    "multi_match": {
                        "query": search_query,
                        "fields": ["query", "response"]
                    }
                })
            
            # Add model filter if provided
            if model:
                must_conditions.append({
                    "term": {
                        "model": model
                    }
                })
            
            # Add user ID filter if provided
            if user_id:
                must_conditions.append({
                    "term": {
                        "user_id": user_id
                    }
                })
            
            # Add session ID filter if provided
            if session_id:
                must_conditions.append({
                    "term": {
                        "session_id": session_id
                    }
                })
            
            # Add timestamp range if provided
            if from_timestamp or to_timestamp:
                # Use @timestamp field instead of timestamp
                range_query = {"range": {"@timestamp": {}}}
                
                if from_timestamp:
                    # Convert to milliseconds for OpenSearch
                    range_query["range"]["@timestamp"]["gte"] = from_timestamp * 1000
                
                if to_timestamp:
                    # Convert to milliseconds for OpenSearch
                    range_query["range"]["@timestamp"]["lte"] = to_timestamp * 1000
                
                must_conditions.append(range_query)
            
            # Build the final query
            query = {
                "bool": {
                    "must": must_conditions if must_conditions else [{"match_all": {}}]
                }
            }
            
            # Adjust sort field if it's "timestamp" to use "@timestamp" instead
            if sort_field == "timestamp":
                sort_field = "@timestamp"
                
            # Execute the search
            response = await self.os_client.search(
                index=self.opensearch_index,
                body={
                    "query": query,
                    "sort": [
                        {sort_field: {"order": sort_order}}
                    ],
                    "from": offset,
                    "size": limit
                }
            )
            
            # Parse results
            hits = response.get("hits", {})
            total = hits.get("total", {}).get("value", 0)
            logs = []
            
            # Process each hit
            for hit in hits.get("hits", []):
                source = hit.get("_source", {})
                
                # Get timestamp from @timestamp field (OpenSearch format)
                timestamp = source.get("@timestamp")
                if timestamp and timestamp > 1600000000000:  # Assuming it's in milliseconds if very large
                    timestamp = int(timestamp / 1000)
                
                log_entry = {
                    "query_id": source.get("query_id", hit.get("_id", "")),
                    "query": source.get("query", ""),
                    "response": source.get("response", ""),
                    "model": source.get("model", ""),
                    "latency_ms": source.get("latency_ms", 0),
                    "timestamp": timestamp,
                    "user_id": source.get("user_id"),
                    "session_id": source.get("session_id"),
                    "metadata": source.get("metadata", {})
                }
                
                logs.append(log_entry)
            
            return {
                "logs": logs,
                "total": total,
                "page": page,
                "limit": limit
            }
            
        except Exception as e:
            logger.error(f"Error getting logs: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error getting logs: {str(e)}"
>>>>>>> Stashed changes
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
cache_url = os.getenv("CACHE_URL")
context_builder_url = os.getenv("CONTEXT_BUILDER_URL")

# Create orchestration service
service = OrchestrationService(
    ollama_api_url=ollama_api_url,
    opensearch_url=opensearch_url,
    opensearch_index=opensearch_index,
    opensearch_username=opensearch_username,
    opensearch_password=opensearch_password,
    cache_url=cache_url,
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
    if cache_url:
        try:
            cache_health = await service.client.get(f"{cache_url}/health")
            cache_status = "healthy" if cache_health.is_success else "unhealthy"
        except Exception:
            cache_status = "unavailable"
    
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


@app.get("/logs", response_model=LogsResponse)
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    q: Optional[str] = None,
    model: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    sort_field: str = "timestamp",
    sort_order: str = "desc"
):
    """Get logs with pagination and filters."""
    # Convert date strings to timestamps if provided
    from_timestamp = None
    to_timestamp = None
    
    if from_date:
        try:
            from_timestamp = int(time.mktime(time.strptime(from_date, "%Y-%m-%dT%H:%M:%S")))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid from_date format. Expected format: YYYY-MM-DDTHH:MM:SS"
            )
    
    if to_date:
        try:
            to_timestamp = int(time.mktime(time.strptime(to_date, "%Y-%m-%dT%H:%M:%S")))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid to_date format. Expected format: YYYY-MM-DDTHH:MM:SS"
            )
    
    return await service.get_logs(
        page=page,
        limit=limit,
        search_query=q,
        model=model,
        from_timestamp=from_timestamp,
        to_timestamp=to_timestamp,
        user_id=user_id,
        session_id=session_id,
        sort_field=sort_field,
        sort_order=sort_order
    )


@app.post("/logs/search", response_model=LogsResponse)
async def search_logs(request: LogSearchRequest):
    """Advanced search for logs."""
    return await service.get_logs(
        page=request.page,
        limit=request.limit,
        search_query=request.query,
        model=request.model,
        from_timestamp=request.from_timestamp,
        to_timestamp=request.to_timestamp,
        user_id=request.user_id,
        session_id=request.session_id,
        sort_field=request.sort_field,
        sort_order=request.sort_order
    )


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