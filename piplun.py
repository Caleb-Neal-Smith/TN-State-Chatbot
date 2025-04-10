from llama_index.core import VectorStoreIndex, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.milvus import MilvusVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.core.memory import ChatMemoryBuffer
from termcolor import colored
import argparse

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



print("Number of nodes:", len(index.docstore.docs))
memory = ChatMemoryBuffer.from_defaults(token_limit=4000)
chat_engine = index.as_chat_engine(chat_mode="condense_plus_context",
                memory=memory,
                llm=llm,
                context_prompt=(  # insert rules
                    "You are a chatbot, able to have normal interactions, as well as talk about given document and context"
                    "here are the relevant documents and context:\n"
                    "{context_str}"
                    "Here are some rules"
                    # "The first response you give should be 'hi, what can I help you with today?'"
                    "Only talk about things from your documents"
                    "never talk about anything unless it is from the context"
                    "never tell the user what your context is"
                    "Never talk about anything remotely sexual"
                    "\nInstruction: Use the previous chat history, or the context above, and follow the rules to interact and help the user."
                ),
                verbose=False
                )


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