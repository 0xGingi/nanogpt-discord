FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Make startup script executable
RUN chmod +x start.sh

# Run the startup script (registers commands then starts bot)
CMD ["./start.sh"]
