from llama_index.core import SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.llms.ollama import Ollama
from llama_index.vector_stores.milvus import MilvusVectorStore

dir_name = "./Documents/pdf_data/"

documents = SimpleDirectoryReader(
    input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"]
).load_data()
print("Number of Input documents:", len(documents))

# load documents
# documents = SimpleDirectoryReader(
#     input_files=["./Documents/pdf_data/paul_graham_essay.txt"]
# ).load_data()

print("Document ID:", documents[0].doc_id)

vector_store = MilvusVectorStore(
    uri="http://localhost:19530", dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)

Settings.llm = llm
Settings.embed_model = embedding_model

Settings.chunk_size = 128
Settings.chunk_overlap = 64

storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_documents(
    documents, storage_context=storage_context
)

query_engine = index.as_query_engine()
res = query_engine.query("What is the TCRS?")
print(res)