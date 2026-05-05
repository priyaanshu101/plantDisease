# backend/Dockerfile

# Use a specific Python version as the base image.
# Align this with your runtime.txt (python-3.11.11)
FROM python:3.11.11-slim-bookworm

# Set the working directory inside the container
WORKDIR /app/backend

# Copy the requirements file first to leverage Docker cache
# This speeds up builds if requirements don't change
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port your FastAPI application will run on
# (Matches the VITE_BACKEND_URL in your frontend .env)
EXPOSE 8010

# Command to run your Uvicorn application
# 'main:app' refers to main.py and the FastAPI instance named 'app'
# --host 0.0.0.0 makes the server accessible from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]