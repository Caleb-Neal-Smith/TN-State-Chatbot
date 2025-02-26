# import arxiv
from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.core import VectorStoreIndex, Settings, StorageContext, load_index_from_storage
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
# from pymilvus import MilvusClient
from dotenv import load_dotenv # Need to have a LlamaParse key saved in .env as "LLAMA_CLOUD_API_KEY=llx-xxxxxx"
load_dotenv()
from llama_parse import LlamaParse

# set up parser
parser = LlamaParse(
    result_type="text"  # "markdown" and "text" are available
)

dir_name = "./Documents/pdf_data/"

# use SimpleDirectoryReader to parse our file
file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader(input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"], file_extractor=file_extractor).load_data()
# print(documents)

# arxiv_client = arxiv.Client()
# paper = next(arxiv.Client().results(arxiv.Search(id_list=["1706.03762"])))

# Download the PDF to a specified directory with a custom filename.
# paper.download_pdf(dirpath=dir_name, filename="attention.pdf")

vector_store = MilvusVectorStore(
    uri="http://localhost:19530",  dim=768, overwrite=True
)

embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-base-en-v1.5")
llm = Ollama(model="llama3.2",temperature=0.1, request_timeout=480.0)

# pdf_document = SimpleDirectoryReader(
#     input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"]
# ).load_data()
# print("Number of Input documents:", len(pdf_document))

# OR execute this command if you have multiple PDFs inside the directory
# pdf_document = SimpleDirectoryReader(
#         dir_name, recursive=True
# ).load_data()

"""
Output:
Number of Input documents: 15
"""

Settings.llm = llm
Settings.embed_model = embedding_model


Settings.chunk_size = 128
Settings.chunk_overlap = 64

# storage_context = StorageContext.from_defaults(
#     persist_dir="storage"
# )

storage_context = StorageContext.from_defaults(
    vector_store=vector_store
)

# index = load_index_from_storage(storage_context)  # loads all indices

index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
index.storage_context.persist(persist_dir="storage")
# print("Number of nodes:", len(index.docstore.docs))

query_engine = index.as_query_engine()

"""
Output:
Number of nodes: 196
"""

choice = 0
while(choice != 1):
    query = input("Ask a question about Tennessee State Treasury: ")

    result = query_engine.query(query)
    print(result)

    choice = int(input("Enter 0 to ask another question or 1 to exit: "))
"""
Output:
Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.
"""
