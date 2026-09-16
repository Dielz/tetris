# Use the official Python slim image
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy only the static assets (no need for dev tools)
COPY src/ ./src/
COPY README.md .

# Install a lightweight HTTP server (Python's built‑in http.server)
# No extra packages needed, using Python's http.server

# Expose port 8000 – default for serve
EXPOSE 8097

# Default command: serve the 'src' directory on port 8097
CMD ["python", "-m", "http.server", "8097", "--directory", "src"]
