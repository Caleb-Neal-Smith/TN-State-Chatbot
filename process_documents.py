from llama_index.core import SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.milvus import MilvusVectorStore
from pymilvus import MilvusClient

dir_name = "./Documents/pdf_data/"

file = "placeholder"

pdf_document = SimpleDirectoryReader(
    input_files=[f"{dir_name}{file}.pdf"]
).load_data()

vector_store = MilvusVectorStore(
    uri="http://149.165.151.119:19530", dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)

Settings.llm = llm
Settings.embed_model = embedding_model

Settings.chunk_size = 128
Settings.chunk_overlap = 64

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(
    pdf_document, storage_context=storage_context
)