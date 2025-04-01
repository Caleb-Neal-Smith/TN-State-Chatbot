#!/bin/bash

# Check for ollama
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Installing ollama..."
    # Replace the following line with the actual installation command or instructions for ollama
    curl -fsSL https://ollama.com/install.sh | sh
fi

# Check for llama 3.3
if ! command -v llama &> /dev/null; then
    echo "Llama 3.3 is not installed. Installing llama 3.3..."
    # Replace the following line with the actual installation command or instructions for llama 3.3
    ollama pull llama3.3
fi

echo "Starting TN_State_Chatbot..."
# Run your packaged executable
./TN_State_Chatbot
