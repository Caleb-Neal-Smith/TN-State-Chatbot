from langchain_ollama import OllamaLLM


def prompter(prompt):
    llm = OllamaLLM(model="llama3.2")
    response = llm.invoke(prompt)
    return response
