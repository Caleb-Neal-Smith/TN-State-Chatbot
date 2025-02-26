from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
# from pymilvus import MilvusClient
from dotenv import load_dotenv
load_dotenv()
from llama_parse import LlamaParse

storage_context.persist(persist_dir="./storage")

# set up parser
parser = LlamaParse(
    result_type="text"  # "markdown" and "text" are available
)

dir_name = "./Documents/pdf_data/"

# use SimpleDirectoryReader to parse our file
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader(input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"], file_extractor=file_extractor).load_data()
# print(documents)

vector_store = MilvusVectorStore(
    uri="http://localhost:19530",  dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")

Settings.embed_model = embedding_model

Settings.chunk_size = 128
Settings.chunk_overlap = 64

