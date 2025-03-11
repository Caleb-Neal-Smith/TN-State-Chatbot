from llama_index.core import VectorStoreIndex, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.llms.ollama import Ollama


vector_store = MilvusVectorStore(
    uri="http://localhost:19530", dim=768, overwrite=False
)

llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)
embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")

Settings.llm = llm
Settings.embed_model = embedding_model

index = VectorStoreIndex.from_vector_store(vector_store)

query_engine = index.as_query_engine()

choice = 0
while(choice != 1):
    query = input("Ask a question about Tennessee State Treasury: ")

    result = query_engine.query(query)
    print(result)

    choice = int(input("Enter 0 to ask another question or 1 to exit: "))