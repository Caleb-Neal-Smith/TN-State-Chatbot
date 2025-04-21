from llama_index.core import SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.milvus import MilvusVectorStore
from pymilvus import MilvusClient

dir_name = "./Documents/pdf_data/"


documents = SimpleDirectoryReader(
        dir_name, recursive=True
).load_data()


print("Document ID:", documents[0].doc_id)

vector_store = MilvusVectorStore(
    uri="http://149.165.151.119:19530", dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
llm = Ollama(model="llama3.3",temperature=0.1, request_timeout=480.0)

Settings.llm = llm
Settings.embed_model = embedding_model

# IMPORTANT: Experiment with chunk sizes and evaluate with performance metrics!!!
Settings.chunk_size = 128
Settings.chunk_overlap = 64

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(
    documents, storage_context=storage_context
)

query_engine = index.as_query_engine()
res = query_engine.query("What is the TCRS?")
print(res)
