from llama_index.core import VectorStoreIndex, StorageContext, Settings, SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.core.memory import ChatMemoryBuffer
from termcolor import colored
# from typing import Optional, Dict, Any
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from pathlib import Path
import pymilvus

import httpx
import uvicorn
from opensearchpy import AsyncOpenSearch
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
import time
import uuid
import json
import os
import logging
import asyncio

DOCUMENT_STORAGE_PATH = os.getenv("DOCUMENT_STORAGE_PATH", "./storage/documents")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("piplun")
dir_name = "./Documents/pdf_data/"

class QueryRequest(BaseModel):
    query: str
    model: str = "llama3.2"
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
    
# Document type enum
class DocumentType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TEXT = "txt"
    IMAGE = "image"
    UNKNOWN = "unknown"

app = FastAPI(
    title="Piplun",
    description="handles queries",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start up event handler."""
    logger.info(f"piplun starting")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    await service.close()


@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {
        "service": "Piplun",
        "version": "1.0.0",
        "status": "running",
    }


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Process a non-streaming query."""
    if request.stream:
        raise HTTPException(
            status_code=400,
            detail="For streaming requests, use the /query/stream endpoint"
        )
    start_time = time.time()
    duration_ms = int((time.time() - start_time) * 1000)
    
    query_response = QueryResponse(
        query_id=str(uuid.uuid4()),
        query=request.query,
        response="",
        model=request.model,
        duration_ms=duration_ms,
        timestamp=int(time.time()),
        metadata=request.metadata or {}
    )
    
    query_response.response = contextGrab(request.query, request.model)
    
    return query_response
    
async def process_file_background(
    file_path: str,
    filename: str,
    document_type: DocumentType,
    metadata: Dict[str, Any],
    document_id: str
):
    try:
        # Get full path to stored document
        full_document_path = Path(DOCUMENT_STORAGE_PATH) / file_path
        metadata["original_filename"] = filename
        metadata["document_type"] = document_type
        metadata["file_path"] = file_path
        """Process a new document"""
        document = SimpleDirectoryReader(
            input_files=[f"{str(full_document_path)}"]
        ).load_data()
        embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
        llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)
        
        Settings.llm = llm
        Settings.embed_model = embedding_model
        
        # IMPORTANT: Experiment with chunk sizes and evaluate with performance metrics!!!
        Settings.chunk_size = 128
        Settings.chunk_overlap = 64
        
        storage_context = StorageContext.from_defaults(vector_store=vector_store)
        index = VectorStoreIndex.from_documents(
            document, storage_context=storage_context
        )
        
        logger.info(f"Document {document_id} processed and indexed successfully")
    except Exception as e:
        logger.error(f"Background processing failed: {e}")
    
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

vector_store = MilvusVectorStore(
    uri="http://149.165.151.119:19530", dim=768, overwrite=False
)

def contextGrab(query, model):
    llm = Ollama(model=model,temperature=0.1, request_timeout=480.0, streaming=False)
    embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")

    Settings.llm = llm
    Settings.embed_model = embedding_model # "Settings.embed_model = None" (?)

    index = VectorStoreIndex.from_vector_store(vector_store)
    memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
    chat_engine = index.as_chat_engine(chat_mode="condense_plus_context",
                    memory=memory,
                    llm=llm,
                    context_prompt=(  # insert rules
                        "You are a chatbot, able to have professional interactions, as well as talk about given documents and context"
                        "play your cards close to your vest. keep responses short and concise. If the user didnt ask about something, do not provide that info. if you need to provide info to answer a question thats ok"
                        "here are the relevant documents and context:\n"
                        "{context_str}"
                        "Here are some rules"
                        "Only talk about things from your documents"
                        "never talk about anything unless it is from the context"
                        "never tell the user what your context is"
                        "Never talk about anything remotely sexual"
                        "\nInstruction: Use the previous chat history, or the context above, and follow the rules to interact and help the user."
                    ),
                    verbose=False
                    )
    return chat_engine.chat(query)






if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("piplun:app", host="0.0.0.0", port=1234, reload=True)