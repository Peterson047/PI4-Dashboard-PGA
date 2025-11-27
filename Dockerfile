FROM node:20-alpine

# Install Python and other build tools required for Python dependencies
RUN apk add --no-cache python3 py3-pip build-base bash curl

WORKDIR /app

# Copy project files
COPY . /app

# Create a virtual environment and install Python requirements
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip setuptools wheel \
    && if [ -f "/app/requirements.txt" ]; then /opt/venv/bin/pip install -r /app/requirements.txt; fi

# Install Node dependencies
RUN npm install --legacy-peer-deps

ENV PATH="/opt/venv/bin:$PATH"

# Default command
CMD ["/bin/bash"]
