# NanoGPT Discord Bot

A Discord chatbot powered by NanoGPT API (subscription models only)

## Features

- Chat with AI models via slash commands
- Support for custom system prompts (via environment variable)
- Document context support (PDF, TXT, MD, and more)
- Per-user and per-server model preferences

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`, `Attach Files`
6. Use the generated URL to invite the bot to your server

### 2. Get NanoGPT API Key

1. Sign up at [NanoGPT](https://nano-gpt.com)
2. Subscribe to a plan
3. Go to settings and generate an API key

### 3. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
NANOGPT_API_KEY=your_nanogpt_api_key
SYSTEM_PROMPT=
DEFAULT_MODEL=zai-org/GLM-4.5-Air
```

### 4. Deploy with Docker Compose

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f bot

# Register slash commands (first time only)
docker compose exec bot bun run register
```

## Commands

| Command | Description |
|---------|-------------|
| `/chat <message>` | Chat with the AI. Optionally include a saved context. |
| `/models` | List all available subscription models |
| `/setmodel <model>` | Set your default model (personal or server-wide) |
| `/usage` | Check your NanoGPT API usage statistics |
| `/context add <file> <name>` | Upload a document as reusable context |
| `/context list` | List all saved contexts |
| `/context view <name>` | View content of a saved context |
| `/context remove <name>` | Remove a saved context |

## Document Support

The bot can process the following file types as context:

- PDF (`.pdf`)
- Plain text (`.txt`, `.text`)
- Markdown (`.md`, `.markdown`)
- Log files (`.log`)
- JSON (`.json`)
- XML (`.xml`)
- CSV (`.csv`)
- HTML (`.html`, `.htm`)