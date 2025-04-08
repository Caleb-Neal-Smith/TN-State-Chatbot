import asyncio
import json
import logging
import os
import time
from enum import Enum
from typing import Dict, List, Optional, Union, Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ollama-api-server")


class LoadBalancingStrategy(str, Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    RANDOM = "random"
    WEIGHTED = "weighted"


class GenerationRequest(BaseModel):
    model: str
    prompt: str
    stream: bool = False
    options: Optional[Dict[str, Any]] = None
    system: Optional[str] = None
    template: Optional[str] = None
    context: Optional[List[int]] = None
    raw: Optional[bool] = False
    keep_alive: Optional[str] = None
    format: Optional[str] = None


class OllamaInstance:
    def __init__(self, url: str, weight: float = 1.0):
        self.url = url
        self.weight = weight
        self.active_connections = 0
        self.total_requests = 0
        self.total_tokens = 0
        self.total_latency = 0
        self.last_health_check = 0
        self.healthy = True
        self.models = []


class OllamaClusterManager:
    def __init__(
        self, 
        instances: List[str],
        strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN,
        health_check_interval: int = 30
    ):
        self.instances = [OllamaInstance(url) for url in instances]
        self.strategy = strategy
        self.current_instance = 0
        self.health_check_interval = health_check_interval
        self.client = httpx.AsyncClient(timeout=60.0)

    async def get_instance(self) -> OllamaInstance:
        """Get the next instance based on the load balancing strategy."""
        healthy_instances = [i for i in self.instances if i.healthy]
        if not healthy_instances:
            raise HTTPException(
                status_code=503, 
                detail="No healthy Ollama instances available"
            )

        if self.strategy == LoadBalancingStrategy.ROUND_ROBIN:
            instance = healthy_instances[self.current_instance % len(healthy_instances)]
            self.current_instance += 1
            return instance
        
        elif self.strategy == LoadBalancingStrategy.LEAST_CONNECTIONS:
            return min(healthy_instances, key=lambda i: i.active_connections)
        
        elif self.strategy == LoadBalancingStrategy.RANDOM:
            import random
            return random.choice(healthy_instances)
        
        elif self.strategy == LoadBalancingStrategy.WEIGHTED:
            # Simple weighted random selection
            total_weight = sum(i.weight for i in healthy_instances)
            r = random.uniform(0, total_weight)
            upto = 0
            for instance in healthy_instances:
                upto += instance.weight
                if upto > r:
                    return instance
            return healthy_instances[-1]  # Fallback

    async def check_health(self, instance: OllamaInstance) -> bool:
        """Check the health of an Ollama instance."""
        try:
            response = await self.client.get(f"{instance.url}/api/tags")
            instance.healthy = response.status_code == 200
            if instance.healthy:
                instance.models = response.json().get("models", [])
                instance.last_health_check = time.time()
            return instance.healthy
        except Exception as e:
            logger.error(f"Health check failed for {instance.url}: {e}")
            instance.healthy = False
            return False

    async def update_instance_stats(self, instance: OllamaInstance, tokens: int, latency: float):
        """Update instance statistics."""
        instance.total_requests += 1
        instance.total_tokens += tokens
        instance.total_latency += latency

    async def health_check_loop(self):
        """Background task to regularly check the health of all instances."""
        while True:
            for instance in self.instances:
                await self.check_health(instance)
            await asyncio.sleep(self.health_check_interval)


# Create FastAPI app
app = FastAPI(
    title="Ollama API Server",
    description="API server for handling requests to Ollama instances with load balancing",
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

# Get Ollama instances from environment or use defaults
ollama_instances = os.getenv("OLLAMA_INSTANCES", "http://localhost:11434").split(",")
load_balancing_strategy = LoadBalancingStrategy(
    os.getenv("LOAD_BALANCING_STRATEGY", LoadBalancingStrategy.ROUND_ROBIN.value)
)

# Create Ollama cluster manager
cluster_manager = OllamaClusterManager(
    instances=ollama_instances,
    strategy=load_balancing_strategy,
)


@app.on_event("startup")
async def startup_event():
    """Run health checks on startup and start health check loop."""
    for instance in cluster_manager.instances:
        await cluster_manager.check_health(instance)
    
    # Start health check loop in the background
    asyncio.create_task(cluster_manager.health_check_loop())


@app.on_event("shutdown")
async def shutdown_event():
    """Close the HTTP client on shutdown."""
    await cluster_manager.client.aclose()


@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "Ollama API Server",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    healthy_instances = [i for i in cluster_manager.instances if i.healthy]
    return {
        "status": "healthy" if healthy_instances else "unhealthy",
        "total_instances": len(cluster_manager.instances),
        "healthy_instances": len(healthy_instances),
        "instances": [
            {
                "url": instance.url,
                "healthy": instance.healthy,
                "active_connections": instance.active_connections,
                "total_requests": instance.total_requests,
                "models": instance.models,
            }
            for instance in cluster_manager.instances
        ],
    }


@app.get("/models")
async def list_models():
    """List all available models across instances."""
    models = set()
    for instance in cluster_manager.instances:
        if instance.healthy:
            models.update(model["name"] for model in instance.models)
    
    return {"models": list(models)}


@app.post("/api/generate")
async def generate(request: GenerationRequest):
    """Generate text with an Ollama model."""
    try:
        # Get an Ollama instance
        instance = await cluster_manager.get_instance()
        instance.active_connections += 1
        
        start_time = time.time()
        
        try:
            # Forward the request to the Ollama instance
            response = await cluster_manager.client.post(
                f"{instance.url}/api/generate",
                json=request.dict(exclude_none=True),
            )
            
            if not response.is_success:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text
                )
            
            # Calculate latency and tokens (approximated)
            latency = time.time() - start_time
            generated_text = response.json().get("response", "")
            tokens = len(generated_text.split())
            
            # Update instance stats
            await cluster_manager.update_instance_stats(
                instance=instance, 
                tokens=tokens, 
                latency=latency
            )
            
            return response.json()
            
        finally:
            instance.active_connections -= 1
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error generating text: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/chat")
async def chat(request: dict):
    """Send a chat request to an Ollama model."""
    try:
        # Get an Ollama instance
        instance = await cluster_manager.get_instance()
        instance.active_connections += 1
        
        start_time = time.time()
        
        try:
            # Forward the request to the Ollama instance
            response = await cluster_manager.client.post(
                f"{instance.url}/api/chat",
                json=request,
            )
            
            if not response.is_success:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.text
                )
            
            # Calculate latency and tokens (approximated)
            latency = time.time() - start_time
            result = response.json()
            message = result.get("message", {})
            content = message.get("content", "")
            tokens = len(content.split())
            
            # Update instance stats
            await cluster_manager.update_instance_stats(
                instance=instance, 
                tokens=tokens, 
                latency=latency
            )
            
            return result
            
        finally:
            instance.active_connections -= 1
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in chat request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/generate/stream")
async def generate_stream(request: GenerationRequest):
    """Stream text generation from an Ollama model."""
    try:
        # Get an Ollama instance
        instance = await cluster_manager.get_instance()
        instance.active_connections += 1
        
        # Make sure streaming is enabled
        request_data = request.dict(exclude_none=True)
        request_data["stream"] = True
        
        start_time = time.time()
        tokens = 0
        
        async def process_stream():
            nonlocal tokens
            
            try:
                async with cluster_manager.client.stream(
                    "POST",
                    f"{instance.url}/api/generate",
                    json=request_data,
                    timeout=300.0
                ) as response:
                    if not response.is_success:
                        error_text = await response.aread()
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=error_text.decode()
                        )
                    
                    async for chunk in response.aiter_text():
                        # Count tokens approximately
                        if "response" in chunk:
                            try:
                                data = json.loads(chunk)
                                text = data.get("response", "")
                                tokens += len(text.split())
                            except:
                                pass
                        
                        yield chunk
                    
                # Update instance stats once streaming is complete
                latency = time.time() - start_time
                await cluster_manager.update_instance_stats(
                    instance=instance, 
                    tokens=tokens, 
                    latency=latency
                )
                
            finally:
                instance.active_connections -= 1
        
        return StreamingResponse(
            process_stream(),
            media_type="text/event-stream"
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error generating streaming text: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/chat/stream")
async def chat_stream(request: dict):
    """Stream chat response from an Ollama model."""
    try:
        # Get an Ollama instance
        instance = await cluster_manager.get_instance()
        instance.active_connections += 1
        
        # Make sure streaming is enabled
        request["stream"] = True
        
        start_time = time.time()
        tokens = 0
        
        async def process_stream():
            nonlocal tokens
            
            try:
                async with cluster_manager.client.stream(
                    "POST",
                    f"{instance.url}/api/chat",
                    json=request,
                    timeout=300.0
                ) as response:
                    if not response.is_success:
                        error_text = await response.aread()
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=error_text.decode()
                        )
                    
                    async for chunk in response.aiter_text():
                        # Count tokens approximately
                        if "message" in chunk:
                            try:
                                data = json.loads(chunk)
                                content = data.get("message", {}).get("content", "")
                                tokens += len(content.split())
                            except:
                                pass
                        
                        yield chunk
                    
                # Update instance stats once streaming is complete
                latency = time.time() - start_time
                await cluster_manager.update_instance_stats(
                    instance=instance, 
                    tokens=tokens, 
                    latency=latency
                )
                
            finally:
                instance.active_connections -= 1
        
        return StreamingResponse(
            process_stream(),
            media_type="text/event-stream"
        )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error streaming chat: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", "8000"))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
