import os
import logging
import json
import asyncio
from typing import List, Dict, Any, Optional

import uvicorn
import chromadb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("context-provider")

# Create a separate logger for retrieval operations
retrieval_logger = logging.getLogger("context-retrieval")
retrieval_logger.setLevel(logging.INFO)

# Add console handler with custom formatting for better readability
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(
    "\n============== %(levelname)s [%(asctime)s] ==============\n%(message)s\n"
))
retrieval_logger.addHandler(console_handler)

# Schema for context request
class ContextRequest(BaseModel):
    query: str
    max_chunks: int = 5
    similarity_threshold: float = 0.7
    metadata_filter: Optional[Dict[str, Any]] = None

# Schema for context response
class ContextResponse(BaseModel):
    query: str
    context: str
    chunks: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Create FastAPI app
app = FastAPI(
    title="Context Provider Service",
    description="Service for retrieving relevant document chunks from vector database",
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

# Configuration from environment variables
CHROMA_HOST = os.getenv("CHROMA_DB_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_DB_PORT", "8000"))
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "docs")
DEFAULT_CHUNK_COUNT = int(os.getenv("DEFAULT_CHUNK_COUNT", "5"))

def get_chroma_client():
    """Get a ChromaDB client."""
    try:
        client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        client.heartbeat()
        return client
    except Exception as e:
        logger.error(f"Failed to connect to ChromaDB: {e}")
        raise

def format_context(chunks: List[Dict[str, Any]]) -> str:
    """Format document chunks into a context string for the LLM."""
    context_parts = []
    
    for i, chunk in enumerate(chunks):
        # Add a header with metadata
        header = f"DOCUMENT {i+1}"
        if "filename" in chunk["metadata"]:
            header += f" - {chunk['metadata']['filename']}"
        
        # Add chunk text with header
        context_parts.append(f"{header}\n{chunk['document']}\n")
    
    return "\n".join(context_parts)

def pretty_format_for_log(obj: Any) -> str:
    """Format an object for nice log display."""
    if isinstance(obj, dict) or isinstance(obj, list):
        return json.dumps(obj, indent=2)
    return str(obj)

@app.on_event("startup")
async def startup_event():
    """Start up event handler."""
    logger.info("Context Provider Service starting up")
    # Check ChromaDB connection
    get_chroma_client()

@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "Context Provider Service",
        "version": "1.0.0",
        "status": "running",
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Check ChromaDB connection
        chroma_client = get_chroma_client()
        collection_exists = COLLECTION_NAME in [c.name for c in chroma_client.list_collections()]
        
        return {
            "status": "healthy" if collection_exists else "unhealthy",
            "chroma": "healthy" if collection_exists else "collection_not_found",
            "collection": COLLECTION_NAME,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/get_context", response_model=ContextResponse)
async def get_context(request: ContextRequest):
    """Get relevant context for a query."""
    try:
        # Log the incoming request
        retrieval_logger.info(f"CONTEXT REQUEST\nQuery: {request.query}\nMax Chunks: {request.max_chunks}\nThreshold: {request.similarity_threshold}")
        if request.metadata_filter:
            retrieval_logger.info(f"Metadata Filter: {pretty_format_for_log(request.metadata_filter)}")
        
        chroma_client = get_chroma_client()
        collection = chroma_client.get_collection(name=COLLECTION_NAME)
        
        # Prepare metadata filter if provided
        where_clause = None
        if request.metadata_filter:
            where_clause = request.metadata_filter
        
        # Query ChromaDB for relevant chunks
        retrieval_logger.info(f"Querying ChromaDB collection '{COLLECTION_NAME}' for similar chunks")
        results = collection.query(
            query_texts=[request.query],
            n_results=request.max_chunks,
            where=where_clause
        )
        
        # Log raw results overview
        retrieval_logger.info(f"Retrieved {len(results['ids'][0])} chunks from ChromaDB")
        
        # Process results
        chunks = []
        for i in range(len(results["ids"][0])):
            chunk_id = results["ids"][0][i]
            document = results["documents"][0][i]
            metadata = results["metadatas"][0][i]
            distance = results["distances"][0][i] if "distances" in results else None
            
            # Filter by similarity threshold if distances are available
            if distance is not None and (1 - distance) < request.similarity_threshold:
                retrieval_logger.info(f"Skipping chunk {chunk_id} - below similarity threshold")
                continue
                
            chunk_info = {
                "chunk_id": chunk_id,
                "document": document,
                "metadata": metadata,
                "relevance": 1 - distance if distance is not None else None
            }
            
            chunks.append(chunk_info)
            
            # Log chunk details
            retrieval_logger.info(f"CHUNK {i+1} - ID: {chunk_id}")
            retrieval_logger.info(f"Source: {metadata.get('filename', 'Unknown')}")
            retrieval_logger.info(f"Relevance: {1 - distance if distance is not None else 'N/A'}")
            retrieval_logger.info(f"Metadata: {pretty_format_for_log(metadata)}")
            
            # Log a preview of the document text (first 100 chars)
            preview = document[:100] + "..." if len(document) > 100 else document
            retrieval_logger.info(f"Content Preview: {preview}")
        
        # Format context
        formatted_context = format_context(chunks)
        
        # Log the formatted context that will be sent to the LLM
        retrieval_logger.info(f"FORMATTED CONTEXT FOR LLM\n{formatted_context}")
        
        # Return response
        return ContextResponse(
            query=request.query,
            context=formatted_context,
            chunks=chunks,
            metadata={
                "total_chunks": len(chunks),
                "original_query": request.query
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_raw_chunks")
async def get_raw_chunks(request: ContextRequest):
    """Get raw chunks without formatting for direct use."""
    try:
        retrieval_logger.info(f"RAW CHUNKS REQUEST\nQuery: {request.query}")
        
        chroma_client = get_chroma_client()
        collection = chroma_client.get_collection(name=COLLECTION_NAME)
        
        # Prepare metadata filter if provided
        where_clause = None
        if request.metadata_filter:
            where_clause = request.metadata_filter
        
        # Query ChromaDB for relevant chunks
        results = collection.query(
            query_texts=[request.query],
            n_results=request.max_chunks,
            where=where_clause
        )
        
        # Log raw results
        retrieval_logger.info(f"Retrieved {len(results['ids'][0])} raw chunks from ChromaDB")
        
        # Return the raw results
        return {
            "query": request.query,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error getting raw chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", "8002"))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)