# context-provider/main.py
import os
import logging
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import Byaldi for multi-modal retrieval
from byaldi import RAGMultiModalModel

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("context-provider")

# Add a separate logger for retrieval operations
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
    description="Multi-modal document context retrieval service using Byaldi",
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
DOCUMENT_STORAGE_PATH = os.getenv("DOCUMENT_STORAGE_PATH", "./storage/documents")
BYALDI_INDEX_ROOT = os.getenv("BYALDI_INDEX_ROOT", "./byaldi_indexes")
BYALDI_MODEL = os.getenv("BYALDI_MODEL", "vidore/colqwen2-v1.0")
INDEX_NAME = os.getenv("BYALDI_INDEX_NAME", "rag_documents")
DEFAULT_CHUNK_COUNT = int(os.getenv("DEFAULT_CHUNK_COUNT", "5"))

# Initialize Byaldi model (lazy initialization)
byaldi_model = None

def get_byaldi_model():
    """Get or initialize the Byaldi model"""
    global byaldi_model
    
    if byaldi_model is None:
        try:
            # Try to load from existing index
            index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
            if index_path.exists():
                logger.info(f"Loading existing Byaldi index from {index_path}")
                byaldi_model = RAGMultiModalModel.from_index(
                    index_path=INDEX_NAME,
                    index_root=BYALDI_INDEX_ROOT,
                    device="cpu",  # Using CPU for reliability
                    verbose=1
                )
                
                # Check if the model was successfully loaded
                if byaldi_model:
                    # Get document count as a quick validation
                    try:
                        doc_count = len(byaldi_model.get_doc_ids_to_file_names())
                        logger.info(f"Successfully loaded index with {doc_count} documents")
                    except Exception as count_error:
                        logger.warning(f"Index loaded but couldn't count documents: {count_error}")
            else:
                logger.warning(f"No existing index found at {index_path}. Initializing new model.")
                byaldi_model = RAGMultiModalModel.from_pretrained(
                    pretrained_model_name_or_path=BYALDI_MODEL,
                    index_root=BYALDI_INDEX_ROOT,
                    device="cpu",  # Using CPU for reliability
                    verbose=1
                )
        except Exception as e:
            logger.error(f"Error initializing Byaldi model: {e}")
            raise
    
    return byaldi_model

def format_context(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format document chunks into a context object for the LLM."""
    context_parts = []
    image_paths = []
    base64_images = []
    
    for i, result in enumerate(results):
        doc_id = result["doc_id"]
        page_num = result["page_num"]
        metadata = result.get("metadata", {})
        
        # Add a header with metadata
        header = f"DOCUMENT {i+1} (Page {page_num})"
        if "original_filename" in metadata:
            header += f" - {metadata['original_filename']}"
            
        # Get image path if available
        page_image_paths = metadata.get("page_image_paths", {})
        if page_image_paths and str(page_num) in page_image_paths:
            image_path = page_image_paths[str(page_num)]
            # Convert to absolute path for frontend
            full_image_path = f"/api/documents/images/{doc_id}/page_{page_num}.png"
            image_paths.append(full_image_path)
        elif result.get("base64"):
            # If we have base64 data but no path
            image_paths.append(None)  # Add None to maintain alignment with base64 list
        
        # Add base64 data if available
        if result.get("base64"):
            base64_images.append(result["base64"])
        
        # Build the context text
        if "file_path" in metadata:
            file_info = f"Source: {metadata.get('original_filename', 'Unknown')}"
            context_parts.append(f"{header}\n{file_info}\n")
    
    context_text = "\n".join(context_parts)
    
    return {
        "text": context_text,
        "image_paths": image_paths,
        "base64_images": base64_images
    }

def pretty_format_for_log(obj: Any) -> str:
    """Format an object for nice log display."""
    if isinstance(obj, dict) or isinstance(obj, list):
        return json.dumps(obj, indent=2)
    return str(obj)

@app.on_event("startup")
async def startup_event():
    """Start up event handler."""
    logger.info("Context Provider Service starting up")
    
    # Check if Byaldi index exists
    index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
    if index_path.exists():
        logger.info(f"Byaldi index found at {index_path}")
    else:
        logger.warning(f"No Byaldi index found at {index_path}. Service may not be operational until an index is created.")

@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "Context Provider Service (Byaldi Multi-Modal)",
        "version": "1.0.0",
        "status": "running",
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Check if Byaldi index exists
        index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
        index_exists = index_path.exists()
        
        return {
            "status": "healthy" if index_exists else "unhealthy",
            "byaldi_index": "healthy" if index_exists else "missing",
            "index_path": str(index_path),
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
        
        # Get Byaldi model
        model = get_byaldi_model()
        
        # Search using Byaldi
        retrieval_logger.info(f"Querying Byaldi index '{INDEX_NAME}' for query: {request.query}")
        
        results = model.search(
            query=request.query,
            k=request.max_chunks,
            filter_metadata=request.metadata_filter,
            return_base64_results=True  # Get base64 encoded images
        )
        
        # Log raw results overview
        retrieval_logger.info(f"Retrieved {len(results)} chunks from Byaldi index")
        
        # Convert results to dicts for easier handling
        dict_results = [r.dict() for r in results]
        
        # Format context for the LLM
        formatted_context = format_context(dict_results)
        
        # Log the formatted context that will be sent to the LLM
        retrieval_logger.info(f"FORMATTED CONTEXT FOR LLM\n{formatted_context['text']}")
        retrieval_logger.info(f"Found {len(formatted_context['image_paths'])} images for context")
        
        # Return response
        return ContextResponse(
            query=request.query,
            context=formatted_context['text'],
            chunks=[
                {
                    "doc_id": r["doc_id"],
                    "page_num": r["page_num"],
                    "score": r["score"],
                    "metadata": r["metadata"],
                    "base64": r["base64"],
                    "image_path": formatted_context['image_paths'][i] if i < len(formatted_context['image_paths']) else None
                }
                for i, r in enumerate(dict_results)
            ],
            metadata={
                "total_chunks": len(dict_results),
                "original_query": request.query,
                "image_paths": formatted_context['image_paths']
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
        
        # Get Byaldi model
        model = get_byaldi_model()
        
        # Search using Byaldi
        results = model.search(
            query=request.query,
            k=request.max_chunks,
            filter_metadata=request.metadata_filter,
            return_base64_results=True
        )
        
        # Log raw results
        retrieval_logger.info(f"Retrieved {len(results)} raw chunks from Byaldi")
        
        # Convert results to dicts
        dict_results = [r.dict() for r in results]
        
        # Add image paths
        for result in dict_results:
            metadata = result.get("metadata", {})
            page_num = result["page_num"]
            doc_id = result["doc_id"]
            
            # Get image path if available
            page_image_paths = metadata.get("page_image_paths", {})
            if page_image_paths and str(page_num) in page_image_paths:
                image_path = page_image_paths[str(page_num)]
                # Convert to absolute path for frontend
                result["image_path"] = f"/api/documents/images/{doc_id}/page_{page_num}.png"
        
        # Return the raw results
        return {
            "query": request.query,
            "results": dict_results
        }

    except Exception as e:
        logger.error(f"Error getting raw chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/reload_index")
async def reload_index():
    """Reload the Byaldi index when new documents are added."""
    try:
        global byaldi_model
        
        # Clear the current model instance
        byaldi_model = None
        
        # Reinitialize the model to load the latest index
        model = get_byaldi_model()
        
        retrieval_logger.info(f"Successfully reloaded Byaldi index from {BYALDI_INDEX_ROOT}/{INDEX_NAME}")
        
        return {
            "status": "success",
            "message": "Index reloaded successfully"
        }
    except Exception as e:
        retrieval_logger.error(f"Error reloading index: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", "8002"))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)