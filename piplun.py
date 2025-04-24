from llama_index.core import VectorStoreIndex, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.core.memory import ChatMemoryBuffer
from termcolor import colored
import argparse

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
    response = contextGrab(request.query, request.model)
    duration_ms = int((time.time() - start_time) * 1000)

    query_response = QueryResponse(
        query_id=str(uuid.uuid4()),
        query=request.query,
        response=response,
        model=request.model,
        duration_ms=duration_ms,
        timestamp=int(time.time()),
        metadata=request.metadata or {}
    )
    return query_response.json()
    

parser = argparse.ArgumentParser()
parser.add_argument("-m", "--model", type=str)
args = parser.parse_args()


vector_store = MilvusVectorStore(
    uri="./milvus/milvus.db", dim=768, overwrite=False
)

llm = Ollama(model=args.model,temperature=0.1, request_timeout=480.0, streaming=True)
embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")

Settings.llm = llm
Settings.embed_model = embedding_model # "Settings.embed_model = None" (?)

index = VectorStoreIndex.from_vector_store(vector_store)



def contextGrab(query, model):
    memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
    chat_engine = index.as_chat_engine(chat_mode="condense_plus_context",
                    memory=memory,
                    llm=Ollama(model=model,temperature=0.1, request_timeout=480.0, streaming=True),
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

def promptAsk():
    
    while True:
        query = input(colored("Query: ", "green"))
        if query == "exit":
            print(" ")
            return "Exiting"
        print(" ")
        res = chat_engine.chat(query)
        print(" ")
        print(res)


print(promptAsk())

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("piplun:app", host="0.0.0.0", port=1234, reload=True)