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

import shutil

import httpx
import uvicorn
from opensearchpy import AsyncOpenSearch
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
import time
import uuid
import json
import os
import logging
import asyncio

UPLOAD_DIR = "./Documents/pdf_data/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Save uploaded file
    file_id = str(uuid.uuid4())
    saved_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Set embedding and LLM settings
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
    Settings.llm = Ollama(model="llama3.2", temperature=0.1, request_timeout=480.0)
    Settings.chunk_size = 128
    Settings.chunk_overlap = 64

    # Process the PDF file
    try:
        documents = SimpleDirectoryReader(input_files=[saved_path]).load_data()

        vector_store = MilvusVectorStore(uri="http://149.165.151.119:19530", dim=768, overwrite=False)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        # Embed and index
        VectorStoreIndex.from_documents(documents, storage_context=storage_context)

        return JSONResponse(content={"status": "success", "file_id": file_id})
    except Exception as e:
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