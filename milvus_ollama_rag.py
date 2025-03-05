# import arxiv
from prompter import *
from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.core import VectorStoreIndex, Settings, StorageContext
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from pymilvus import MilvusClient
#from dotenv import load_dotenvload_dotenv
#from llama_parse import LlamaParse
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core.storage.index_store import SimpleIndexStore 
#from llama_index.core.storage.vector_stores import SimpleVectorStore
from llama_index.core import load_index_from_storage
# set up parser
#parser = LlamaParse(result_type="text")#"markdown" and "text" are available
dir_name = "./Documents/pdf_data/"
# use SimpleDirectoryReader to parse our file
#file_extractor = {".pdf": parser}
#documents = SimpleDirectoryReader(input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"], file_extractor=file_extractor).load_data()
#print(documents)

#documents = SimpleDirectoryReader(input_files = [f"{dir_name}attention.pdf"]).load_data()
#print("Number of Input Documents: ", len(documents))

vector_store = MilvusVectorStore(uri="./milvus-rag.db",dim=1024, overwrite=False)
embedding_model = HuggingFaceEmbedding(model_name="BAAI/bge-large-en-v1.5")
llm = Ollama(model="llama3.3",temperature=0.1, request_timeout=480.0)
# pdf_document = SimpleDirectoryReader(#input_files=[f"{dir_name}RFI 30901-57524 Project ARIS FINAL (3).pdf"]# ).load_data()
# print("Number of Input documents:", len(pdf_document))
# # OR execute this command if you have multiple PDFs inside the directory# 
#pdf_document = SimpleDirectoryReader(#dir_name, recursive=True# ).load_data()

Settings.llm = llm
Settings.embed_model = embedding_model
Settings.chunk_size = 256
Settings.chunk_overlap = 64



#index = VectorStoreIndex.from_documents(documents, vector_store=vector_store)
#index.storage_context.persist(persist_dir="./storage")

 
 
storage_context = StorageContext.from_defaults(persist_dir="storage")

index = load_index_from_storage(storage_context)



print("Number of nodes:", len(index.docstore.docs))
memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
chat_engine = index.as_chat_engine(chat_mode="condense_plus_context",
    memory=memory,
    llm=llm,
    context_prompt=(#insert rules
        "You are a chatbot, able to have normal interactions, as well as talk about given document and context"
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



decision = save_choice()
while True:
    query = input("ASK:")
    if query=="exit":
        break
    res = chat_engine.chat(query)
    print(res)
    if decision:
        logging(decision,query,str(res))



 