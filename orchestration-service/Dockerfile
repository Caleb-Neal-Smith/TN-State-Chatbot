FROM python:3.11-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 9000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]