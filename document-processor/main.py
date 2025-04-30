# document-processor/main.py
import os
import uuid
import tempfile
import logging
import asyncio
import base64
import shutil
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from pathlib import Path

import uvicorn
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

# Import Byaldi for multi-modal document processing
from byaldi import RAGMultiModalModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("document-processor")

# Document type enum
class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TEXT = "txt"
    IMAGE = "image"
    UNKNOWN = "unknown"

# Schema for document chunk
class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Schema for processed document
class ProcessedDocument(BaseModel):
    document_id: str
    filename: str
    document_type: DocumentType
    chunk_count: int
    metadata: Dict[str, Any] = Field(default_factory=dict)
    status: str = "processed"

# Create FastAPI app
app = FastAPI(
    title="Document Processing Service",
    description="Multi-modal document processing service using Byaldi",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from environment variables
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
DOCUMENT_STORAGE_PATH = os.getenv("DOCUMENT_STORAGE_PATH", "./storage/documents")
BYALDI_INDEX_ROOT = os.getenv("BYALDI_INDEX_ROOT", "./byaldi_indexes")
BYALDI_MODEL = os.getenv("BYALDI_MODEL", "vidore/colqwen2-v1.0")
INDEX_NAME = os.getenv("BYALDI_INDEX_NAME", "rag_documents")

# HTTP client
http_client = httpx.AsyncClient(timeout=60.0)

# Initialize Byaldi model (lazy initialization)
byaldi_model = None

def get_byaldi_model():
    """Get or initialize the Byaldi model"""
    global byaldi_model
    
    if byaldi_model is None:
        try:
            # Check if index exists
            index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
            
            if index_path.exists():
                # Try to load from existing index
                logger.info(f"Loading existing Byaldi index from {index_path}")
                byaldi_model = RAGMultiModalModel.from_index(
                    index_path=INDEX_NAME,
                    index_root=BYALDI_INDEX_ROOT,
                    device="cpu",  # Use CPU for now since GPU access isn't working
                    verbose=1
                )
            else:
                # Initialize a new model without loading from index
                logger.info(f"Creating new Byaldi model using {BYALDI_MODEL}")
                byaldi_model = RAGMultiModalModel.from_pretrained(
                    pretrained_model_name_or_path=BYALDI_MODEL,
                    index_root=BYALDI_INDEX_ROOT,
                    device="cpu",  # Use CPU for now since GPU access isn't working
                    verbose=1
                )
        except Exception as e:
            logger.error(f"Error initializing Byaldi model: {e}")
            raise
    
    return byaldi_model

def detect_document_type(filename: str, content_type: str = None) -> DocumentType:
    """Detect document type from filename and content type."""
    extension = filename.lower().split('.')[-1]
    
    # First check based on file extension
    if extension == "pdf":
        return DocumentType.PDF
    elif extension in ["docx", "doc"]:
        return DocumentType.DOCX
    elif extension in ["txt", "text"]:
        return DocumentType.TEXT
    elif extension in ["jpg", "jpeg", "png", "gif"]:
        return DocumentType.IMAGE
    
    # If extension check doesn't provide a clear answer, check content type
    if content_type:
        if 'pdf' in content_type:
            return DocumentType.PDF
        elif 'word' in content_type or 'docx' in content_type or 'doc' in content_type:
            return DocumentType.DOCX
        elif 'text' in content_type or 'txt' in content_type or 'plain' in content_type:
            return DocumentType.TEXT
        elif 'image' in content_type:
            return DocumentType.IMAGE
    
    # Default case
    return DocumentType.UNKNOWN

async def save_document_to_storage(file_content: bytes, original_filename: str, document_id: str) -> str:
    """Save uploaded document to storage and return the path."""
    # Create year/month based directory
    from datetime import datetime
    now = datetime.now()
    year_month = f"{now.year}/{now.month:02d}"
    
    # Full storage path
    storage_dir = Path(DOCUMENT_STORAGE_PATH) / year_month
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    # Get file extension
    ext = original_filename.split('.')[-1].lower()
    
    # Create filename with document_id and original extension
    filename = f"{document_id}.{ext}"
    
    # Full file path
    file_path = storage_dir / filename
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    # Return relative path from storage root
    return str(Path(year_month) / filename)

async def save_document_images(document_id: str, file_path: str, document_type: DocumentType) -> Dict[int, str]:
    """
    Save document as images in the storage path
    Returns a mapping of page numbers to image paths
    """
    full_path = Path(DOCUMENT_STORAGE_PATH) / file_path
    images_dir = Path(DOCUMENT_STORAGE_PATH) / "images" / document_id
    images_dir.mkdir(parents=True, exist_ok=True)
    
    page_image_paths = {}
    
    if document_type == DocumentType.PDF:
        from pdf2image import convert_from_path
        
        # Convert PDF to images
        images = convert_from_path(
            full_path,
            thread_count=os.cpu_count() - 1,
            output_folder=str(images_dir),
            fmt="png",
            output_file=f"page"
        )
        
        # Save paths for each page
        for i, image in enumerate(images):
            page_num = i + 1  # 1-indexed page numbers
            image_filename = f"page_{page_num}.png"
            image_path = images_dir / image_filename
            
            # Ensure the file is saved (pdf2image doesn't always name files consistently)
            if not image_path.exists():
                image.save(image_path)
                
            page_image_paths[page_num] = str(Path("images") / document_id / image_filename)
            
    elif document_type == DocumentType.IMAGE:
        # For single images, just make a copy in the images directory
        image_filename = f"page_1.png"
        image_path = images_dir / image_filename
        
        # Open and save to ensure consistent format
        img = Image.open(full_path)
        img.save(image_path)
        
        page_image_paths[1] = str(Path("images") / document_id / image_filename)
        
    elif document_type in [DocumentType.DOCX, DocumentType.TEXT]:
        # For DOCX/text, we could implement a text-to-image conversion or 
        # use a document renderer, but for now we'll skip this
        logger.warning(f"Document type {document_type} not supported for image extraction yet")
        
    return page_image_paths

async def process_file_background(
    file_path: str,
    filename: str,
    document_type: DocumentType,
    metadata: Dict[str, Any],
    document_id: str
):
    """Background task to process a file with Byaldi."""
    try:
        # Get full path to stored document
        full_document_path = Path(DOCUMENT_STORAGE_PATH) / file_path
        
        # First save the document as images
        page_image_paths = await save_document_images(document_id, file_path, document_type)
        
        # Add image paths to metadata
        metadata["page_image_paths"] = page_image_paths
        metadata["original_filename"] = filename
        metadata["document_type"] = document_type
        metadata["file_path"] = file_path
        
        # Initialize or get Byaldi model
        model = get_byaldi_model()
        
        # Check if the Byaldi index exists
        index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
        
        if index_path.exists():
            # Add document to existing index
            logger.info(f"Adding document to existing index at {index_path}")
            model.add_to_index(
                input_item=str(full_document_path),
                store_collection_with_index=True,  # Store base64 encoded images
                doc_id=int(document_id) if document_id.isdigit() else hash(document_id),
                metadata=metadata
            )
        else:
            # Create new index with this document
            logger.info(f"Creating new index at {index_path} with document {document_id}")
            model.index(
                input_path=str(full_document_path),
                index_name=INDEX_NAME,
                store_collection_with_index=True,
                doc_ids=[int(document_id) if document_id.isdigit() else hash(document_id)],
                metadata=[metadata],
                overwrite=True
            )
        
        logger.info(f"Document {document_id} processed and indexed successfully")

        try:
            context_provider_url = os.getenv("CONTEXT_PROVIDER_URL", "http://context-provider:8002")
            reload_response = await http_client.post(f"{context_provider_url}/reload_index")
            
            if reload_response.is_success:
                logger.info("Successfully notified context provider to reload index")
            else:
                logger.warning(f"Failed to notify context provider: {reload_response.text}")
                
        except Exception as reload_error:
            logger.error(f"Error notifying context provider: {reload_error}")
        
    except Exception as e:
        logger.error(f"Background processing failed: {e}")

@app.on_event("startup")
async def startup_event():
    """Start up event handler."""
    # Ensure storage directories exist
    Path(DOCUMENT_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    Path(BYALDI_INDEX_ROOT).mkdir(parents=True, exist_ok=True)
    
    # Initialize Byaldi model (but don't actually load it until needed)
    try:
        # Just check if we can load the model, but don't actually load it yet
        index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
        if index_path.exists():
            logger.info(f"Byaldi index exists at {index_path}")
        else:
            logger.info(f"No existing Byaldi index found at {index_path}, will create when needed")
    except Exception as e:
        logger.error(f"Error checking Byaldi index: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    # Close HTTP client
    await http_client.aclose()

@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "Document Processing Service (Byaldi Multi-Modal)",
        "version": "1.0.0",
        "status": "running",
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Check if Byaldi index exists
        index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
        byaldi_health = index_path.exists()
        
        # Optional: Check Ollama API if needed
        try:
            ollama_response = await http_client.get(f"{OLLAMA_API_URL}/health")
            ollama_health = ollama_response.status_code == 200
        except Exception:
            ollama_health = False
        
        return {
            "status": "healthy" if byaldi_health else "unhealthy",
            "byaldi": "healthy" if byaldi_health else "unhealthy",
            "ollama": "healthy" if ollama_health else "unhealthy",
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/process", response_model=Dict[str, Any])
async def process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    metadata: str = Form("{}")
):
    """Endpoint to upload and process a document."""
    try:
        # Parse metadata
        try:
            import json
            metadata_dict = json.loads(metadata)
        except Exception:
            metadata_dict = {}
        
        # Get document ID from metadata or generate new one
        document_id = metadata_dict.get("documentId")
        if not document_id:
            document_id = str(uuid.uuid4())
            logger.warning(f"No document ID provided in metadata, generated new ID: {document_id}")
        
        # Detect document type using both filename and content type
        document_type = detect_document_type(file.filename, file.content_type)
        if document_type == DocumentType.UNKNOWN:
            # Log the content type for debugging
            logger.warning(f"Unsupported file type. Filename: {file.filename}, Content-Type: {file.content_type}")
            raise HTTPException(status_code=400, detail=f"Unsupported file type. Content-Type: {file.content_type}")
        
        # Read and save the uploaded file
        contents = await file.read()
        file_path = await save_document_to_storage(contents, file.filename, document_id)
        
        # Add file info to metadata
        metadata_dict["original_filename"] = file.filename
        metadata_dict["content_type"] = file.content_type or "unknown"
        
        # Add the processing task to background tasks
        background_tasks.add_task(
            process_file_background,
            file_path,
            file.filename,
            document_type,
            metadata_dict,
            document_id
        )
        
        return {
            "status": "processing",
            "document_id": document_id,
            "filename": file.filename,
            "document_type": document_type,
            "message": "File uploaded and processing started in the background"
        }
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/documents/{document_id}")
async def delete_document(document_id: str, filename: str = None):
    """Delete a document and its associated vectors from the index."""
    try:
        logger.info(f"Received request to delete document with ID: {document_id}")
        
        # Get the Byaldi model
        model = get_byaldi_model()
        
        # Get mapping of doc IDs to file names
        doc_id_map = model.get_doc_ids_to_file_names()
        
        # Check if document exists in the index
        found = False
        for doc_id, fname in doc_id_map.items():
            if str(doc_id) == document_id or (filename and filename in fname):
                found = True
                break
        
        if not found:
            logger.warning(f"Document {document_id} not found in index")
            return {
                "status": "warning",
                "message": f"Document {document_id} not found in index"
            }
        
        # Remove document from index (Byaldi doesn't have removal yet, so we'd need to reindex)
        logger.warning("Document removal not directly supported - rebuilding index without this document")
        
        # Get document metadata to find image paths
        # Clean up the document images if they exist
        images_dir = Path(DOCUMENT_STORAGE_PATH) / "images" / document_id
        if images_dir.exists():
            shutil.rmtree(images_dir)
            logger.info(f"Removed images directory for document {document_id}")
            
        # For now, we'd just return a message indicating limited removal capability
        return {
            "status": "partial_success",
            "message": f"Document {document_id} image files have been removed. Full index cleanup requires reindexing."
        }
            
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )
   
@app.get("/status")
async def service_status():
    """Get service status and statistics."""
    try:
        # Check if Byaldi index exists
        index_path = Path(BYALDI_INDEX_ROOT) / INDEX_NAME
        if index_path.exists():
            try:
                # Get document count (would require loading the model)
                model = get_byaldi_model()
                doc_id_map = model.get_doc_ids_to_file_names()
                document_count = len(doc_id_map)
            except Exception as e:
                logger.error(f"Error getting document count: {e}")
                document_count = "unknown"
        else:
            document_count = 0
        
        return {
            "status": "running",
            "index": str(index_path),
            "index_exists": index_path.exists(),
            "document_count": document_count,
            "model": BYALDI_MODEL
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv("PORT", "8001"))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)