#!/usr/bin/env bash
# =============================================================================
# Startup script for Piplun (piplun.py)
# This script runs the Uvicorn server, displays the port, and shows ASCII art
# Usage: ./start_piplun.sh [port]
# If no port is provided, it defaults to $PORT env variable or 8000
# =============================================================================

# ASCII art banner
cat << "EOF"
░▒▓███████▓▒░       ░▒▓█▓▒░      ░▒▓███████▓▒░       ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓███████▓▒░       
░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      
░▒▓███████▓▒░       ░▒▓█▓▒░      ░▒▓███████▓▒░       ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░             ░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░             ░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░      
░▒▓█▓▒░             ░▒▓█▓▒░      ░▒▓█▓▒░             ░▒▓████████▓▒░       ░▒▓██████▓▒░       ░▒▓█▓▒░░▒▓█▓▒░      
                                                                                                                 
                                                                                                                 
EOF

# Determine port: first argument, then $PORT env, then default 8000
PORT_ARG="$1"
if [[ -n "$PORT_ARG" ]]; then
  PORT="$PORT_ARG"
elif [[ -n "$PORT" ]]; then
  PORT="$PORT"
else
  PORT=8000
fi

echo "Starting Piplun server on port: $PORT"

# Run Uvicorn
exec uvicorn piplun:app --host 0.0.0.0 --port "$PORT" --reload
