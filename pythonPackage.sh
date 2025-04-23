#!/bin/bash
echo "Starting Installer..."
#Package everything with all dependencies
pyinstaller --onefile --hidden-import=pkg_resources --name TN_State_Chatbot milvus_ollama_rag.py


echo "Installer done, Package saved in dist"