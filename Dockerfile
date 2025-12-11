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

# Run the bot
CMD ["bun", "run", "src/index.ts"]
