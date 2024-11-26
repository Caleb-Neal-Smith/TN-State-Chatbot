#these are milvus example, originally use gpt, I tried to switch to ollama while waiting for the data
#when Have the data, will verify its fuction with gpt, then may switch to ollama or more efficient local model

#run these on cli
!pip install pymilvus>=2.4.2
!pip install llama-index
!pip install milvus
!pip install llama-index-vector-stores-milvus
!pip install llama-index-embeddings-huggingface

!mkdir -p 'data/'
!wget 'https://raw.githubusercontent.com/run-llama/llama_index/main/docs/docs/examples/data/paul_graham/paul_graham_essay.txt' -O 'data/paul_graham_essay.txt'
!wget 'https://raw.githubusercontent.com/run-llama/llama_index/main/docs/docs/examples/data/10k/uber_2021.pdf' -O 'data/uber_2021.pdf'
from llama_index.core import SimpleDirectoryReader

documents = SimpleDirectoryReader(
    input_files=["./data/paul_graham_essay.txt"]
).load_data()

print("Document ID:", documents[0].doc_id)
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.milvus import MilvusVectorStore


vector_store = MilvusVectorStore(uri="./milvus_demo.db", dim=384, overwrite=True)
storage_context = StorageContext.from_defaults(vector_store=vector_store)


from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import requests
import json
embedding_model_name = "sentence-transformers/all-MiniLM-L6-v2"
hf_embedding = HuggingFaceEmbedding(model_name=embedding_model_name)
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_context,
    embed_model=hf_embedding
)
# Step 4: Ollama API setup
OLLAMA_API_URL = "http://localhost:11434/api/generate"
def query_with_ollama(prompt, model="llama3.2"):


    OLLAMA_API_URL = "http://localhost:11434/api/generate"


    data = {
    "model": "llama3.2",
    "prompt": prompt,
    "stream": False
    }

    headers = {"Content-Type": "application/json"}

    response = requests.post(OLLAMA_API_URL, json=data, headers=headers)

    if response.status_code == 200:
        response_json = response.json()
        #print("Response:", response_json.get("response"))
        return response_json.get("response")
    else:
        print(f"Error: {response.status_code} - {response.text}")

query = "What did the author learn?"

query_engine = index.as_query_engine(llm=None)
retrieved_context = query_engine.query(query)

ollama_prompt = f"Context: {retrieved_context}\n\nQuestion: {query}"
ollama_response = query_with_ollama(ollama_prompt)

# Step 6: Display results
print("Document Context:", retrieved_context)
print("Ollama Response:", ollama_response)
