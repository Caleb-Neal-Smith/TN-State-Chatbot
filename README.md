# TN State Chatbot

A  Retrieval-Augmented Generation (RAG) system with document management, query orchestration, and administrative UI.

## Architecture Overview

This system implements a microservices architecture for a scalable RAG pipeline:

```mermaid
graph TD
    subgraph "Frontend"
        AdminUI[Admin UI]
    end

    subgraph "Core Services"
        OrchestrService[Orchestration Service]
        DocProcessor[Document Processor]
        ContextProvider[Context Provider]
        OllamaAPI[Ollama API Server]
    end

    subgraph "Storage"
        OpenSearch[(OpenSearch)]
        Milvus[(Milvus Vector Store)]
        PostgreSQL[(PostgreSQL Database)]
    end

    subgraph "External"
        Ollama[Ollama LLM Instances]
    end

    AdminUI -->|Upload Documents| DocProcessor
    AdminUI -->|Query LLM| OrchestrService
    
    OrchestrService -->|Get Context| ContextProvider
    OrchestrService -->|Generate Text| OllamaAPI
    OrchestrService -->|Log Interactions| OpenSearch
    
    ContextProvider -->|Query Vectors| Milvus
    
    DocProcessor -->|Store Embeddings| Milvus
    
    OllamaAPI -->|Load Balance Requests| Ollama
    
    AdminUI -->|Store Document Metadata| PostgreSQL
```

---

```mermaid
sequenceDiagram
    actor User
    participant AdminUI as Admin UI
    participant API as Admin API
    participant OrchestrService as Orchestration Service
    participant ContextProvider as Context Provider
    participant Milvus as Milvus Vector Store
    participant OllamaAPI as Ollama API Server
    participant Ollama as Ollama LLM
    participant OpenSearch as OpenSearch

    User->>AdminUI: Enter query
    AdminUI->>API: POST /api/chat
    API->>OrchestrService: Forward query
    
    
    OrchestrService->>ContextProvider: Get context for query
    ContextProvider->>Milvus: Retrieve relevant chunks
    Milvus-->>ContextProvider: Return chunks
    ContextProvider-->>OrchestrService: Return formatted context
    
    OrchestrService->>OllamaAPI: Generate response with context
    OllamaAPI->>Ollama: Forward to LLM instance
    Ollama-->>OllamaAPI: Return generated text
    OllamaAPI-->>OrchestrService: Return response
    
    OrchestrService->>OpenSearch: Log interaction
    
    OrchestrService-->>API: Return response
    API-->>AdminUI: Display response
    AdminUI-->>User: Show answer
```

### Key Components:

- **Admin UI**: Next.js dashboard for document management and chat interface
- **Document Processor**: Handles document parsing, chunking, and embedding
- **Context Provider**: Retrieves relevant document chunks for queries
- **Ollama API Server**: Load balancer for LLM inference
- **Orchestration Service**: Coordinates the entire RAG workflow

### Key Features:

- Document upload and management
- Vector embeddings via Milvus
- Context-aware query processing
- Interaction logging and analytics
- Load balancing for LLM instances

## Getting Started

The simplest way to deploy the entire system is using Docker Compose:

Pull the repository:

```bash
git pull https://github.com/Caleb-Neal-Smith/TN-State-Chatbot
```

```bash
docker-compose up -d
```
