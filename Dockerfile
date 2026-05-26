FROM node:18-bullseye

WORKDIR /app

# Create non-root user per Hugging Face requirements
RUN useradd -m -u 999 user && \
    mkdir -p /app/data && \
    chown -R user:user /app

# Copy only what's needed (avoid local node_modules)
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Ensure data dir is writable
RUN mkdir -p /app/data && chmod 777 /app/data

# Hugging Face Spaces expects port 7860
ENV PORT=7860
EXPOSE 7860

USER user
CMD ["node", "server.js"]
