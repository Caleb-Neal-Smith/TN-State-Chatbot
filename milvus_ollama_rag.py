import arxiv
from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from pymilvus import MilvusClient

dir_name = "./Documents/pdf_data/"

arxiv_client = arxiv.Client()
paper = next(arxiv.Client().results(arxiv.Search(id_list=["1706.03762"])))

# Download the PDF to a specified directory with a custom filename.
paper.download_pdf(dirpath=dir_name, filename="attention.pdf")

vector_store = MilvusVectorStore(
    uri="./milvus_rag_demo.db",  dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)

pdf_document = SimpleDirectoryReader(
    input_files=[f"{dir_name}attention.pdf"]
).load_data()
print("Number of Input documents:", len(pdf_document))

# OR execute this command if you have multiple PDFs inside the directory
pdf_document = SimpleDirectoryReader(
        dir_name, recursive=True
).load_data()

"""
Output:
Number of Input documents: 15
"""

Settings.llm = llm
Settings.embed_model = embedding_model


Settings.chunk_size = 128
Settings.chunk_overlap = 64

index = VectorStoreIndex.from_documents(pdf_document)
print("Number of nodes:", len(index.docstore.docs))

query_engine = index.as_query_engine()

"""
Output:
Number of nodes: 196
"""

query = "What is the benefit of multi-head attention instead of single-head attention?"

result = query_engine.query(query)
print(result)
"""
Output:
Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.
"""
