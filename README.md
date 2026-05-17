# NanoGPT Discord Bot

A Discord bot powered by the NanoGPT API. It supports chat, memory, document context, image generation/editing, audio, video, embeddings, direct search, data extraction, detection, TEE metadata, and character workflows.

## Features

- Slash-command AI chat with per-user and per-server model defaults
- Optional local conversation memory with `/memory`
- Reusable document context from PDF, TXT, Markdown, JSON, XML, CSV, HTML, and log files
- NanoGPT model catalogs for subscription, paid, canonical, personalized, image, video, audio, embedding, and character models
- Pay-as-you-go capable API access for supported NanoGPT endpoints
- Advanced `json` passthrough options on broad API commands for fast-moving NanoGPT fields
- Result JSON attachments for large extraction, embedding, detection, and metadata responses

## Setup

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" and create a bot
4. Copy the bot token
5. Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`, `Attach Files`
6. Use the generated URL to invite the bot to your server

### 2. Get NanoGPT API Key

1. Sign up at [NanoGPT](https://nano-gpt.com)
2. Generate an API key in settings
3. Add balance or subscribe to a plan depending on which endpoints you want to use

### 3. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Minimum required `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
NANOGPT_API_KEY=your_nanogpt_api_key
NANOGPT_BASE_URL=https://nano-gpt.com/api
SYSTEM_PROMPT=
DEFAULT_MODEL=moonshotai/kimi-latest
DATABASE_PATH=./data/bot.db
```

### 4. Deploy

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f bot

# Register slash commands
docker compose exec bot bun run register
```

For local development:

```bash
bun install
bun run register
bun run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/chat` | Stateless chat completion with context, image input, web search suffixes, sampling, reasoning, provider, billing, suffix, and advanced JSON options |
| `/memory chat` | Chat with local per-user memory |
| `/memory view` | View recent local memory |
| `/memory stats` | Show memory statistics |
| `/memory clear` | Clear local memory |
| `/models` | List NanoGPT model catalogs by type, with optional detailed metadata |
| `/setmodel` | Set personal or server default model |
| `/usage` | Check NanoGPT subscription usage |
| `/context add/list/view/remove` | Manage reusable document contexts |
| `/imagine` | Backward-compatible image generation command |
| `/scrape` | Scrape up to five URLs with optional stealth mode and downloadable output |
| `/responses create` | Use NanoGPT's Responses API |
| `/messages create` | Use NanoGPT's Anthropic-compatible Messages API |
| `/completion` | Use legacy completions |
| `/tokens count` | Count tokens for a Messages API-style request |
| `/extract firecrawl` | Run Firecrawl scrape, map, or crawl |
| `/extract maps` | Extract Google Maps places with required result and cost caps |
| `/extract maps-reviews` | Extract Google Maps reviews with required review and cost caps |
| `/extract facebook-ads` | Extract Facebook ads from request JSON |
| `/extract instagram-profile` | Extract Instagram profile data from request JSON |
| `/extract instagram-posts` | Extract Instagram posts from request JSON |
| `/extract reddit` | Extract Reddit data from request JSON |
| `/extract tiktok` | Extract TikTok data from request JSON |
| `/extract hunter` | Use Hunter domain search, email finder, verifier, or discover |
| `/image generate` | Generate images through the image API |
| `/image edit` | Edit images with optional mask input |
| `/image classify` | Run NSFW image classification |
| `/video generate/status/recover/extend/content` | Use NanoGPT video generation and job utilities |
| `/audio speech` | Generate OpenAI-compatible speech/audio and return an audio file |
| `/audio tts/tts-status` | Use legacy async TTS/music endpoints |
| `/audio transcribe/transcribe-status` | Transcribe audio or check transcription status |
| `/audio voice-clone` | Create a voice clone from an audio sample |
| `/search web` | Run direct NanoGPT web search |
| `/embed create` | Create embeddings and return a JSON attachment |
| `/detect ai` | Run AI text detection |
| `/detect plagiarism` | Run plagiarism detection |
| `/youtube transcribe` | Transcribe a YouTube video |
| `/tee attestation/signature` | Fetch TEE verification metadata |
| `/characters search/mine/view/create/edit/delete/review/report` | Search and manage NanoGPT characters |

## Common Options

### `/chat`

| Option | Description |
|--------|-------------|
| `message` | Required user message |
| `context` | Saved context name to inject into the system prompt |
| `model` | One-off model override |
| `searchprovider` | `default`, `linkup`, `tavily`, `exa`, `kagi`, `brave`, or `valyu` |
| `searchvariant` | Provider-specific variant such as `deep`, `fast`, `auto`, `neural`, `web`, or `news` |
| `temperature`, `top_p`, `max_tokens` | Sampling and output controls |
| `reasoning` | Reasoning effort, when supported by the model |
| `provider` | NanoGPT provider override header |
| `billing` | `paygo` or `subscription` |
| `suffix` | Exact model suffix override, for example `:online/linkup-deep` |
| `json` | Advanced NanoGPT chat request fields as a JSON object |
| `image` | Optional image attachment for multimodal models |

### `/imagine`

| Option | Description |
|--------|-------------|
| `prompt` | Required image prompt |
| `model` | Image model, with autocomplete |
| `size` | Any model-supported size string |
| `count` | Number of images, up to 10 |
| `guidance`, `steps`, `seed` | Generation controls |
| `image`, `strength` | Image-to-image input and strength |
| `mask` | Mask image for edit/inpainting models |
| `kontext_max_mode` | Flux Kontext max mode |
| `json` | Advanced image request fields |

### Advanced JSON Passthrough

Most parity commands include a `json` option. This must be a JSON object and is merged into the request body or query before calling NanoGPT. Use it for fields that are model-specific, newly added in NanoGPT, or too large for Discord's slash-command option limits.

Example:

```json
{"maxTotalChargeUsd":0.25,"includeReviews":true}
```

## Data Extraction Safety

Extraction commands can incur pay-as-you-go costs. The Maps commands require explicit caps:

- `/extract maps` requires `limit` and `max_cost`
- `/extract maps-reviews` requires `max_reviews` and `max_cost`

Other extraction endpoints accept request JSON directly so you can pass NanoGPT's documented cost and result controls.

## Feature Toggles

Feature toggles use this convention:

| Value | Effect |
|-------|--------|
| `false` | Feature enabled for everyone |
| `true` | Feature disabled for everyone |
| `admin` | Feature available only to admin users or `CONTEXT_ADMIN_USERS` |

Configured toggles:

- `DISABLE_WEBSEARCH`
- `DISABLE_DEEPSEARCH`
- `DISABLE_IMAGEGEN`
- `DISABLE_SCRAPE`
- `DISABLE_PAYGO`
- `DISABLE_VIDEO`
- `DISABLE_AUDIO`
- `DISABLE_EMBEDDINGS`
- `DISABLE_DETECTION`
- `DISABLE_DIRECT_SEARCH`
- `DISABLE_ADVANCED_CHAT`

Missing toggle variables default to `false`, which means enabled. `DISABLE_PAYGO` gates pay-as-you-go style commands and explicit `billing:paygo` chat requests; the broad media, embeddings, detection, direct search, and advanced chat commands also use their feature-specific toggles at command entry.

## Document Context

Contexts can be personal or shared with the server:

- `scope:user` is personal to the user
- `scope:server` is shared with the server

Supported file types:

- PDF (`.pdf`)
- Plain text (`.txt`, `.text`)
- Markdown (`.md`, `.markdown`)
- Log files (`.log`)
- JSON (`.json`)
- XML (`.xml`)
- CSV (`.csv`)
- HTML (`.html`, `.htm`)

## Notes

- Existing user or server defaults stored in SQLite override `DEFAULT_MODEL`.
- Register slash commands again after command changes with `bun run register`.
- Large API results are returned as JSON attachments to avoid Discord message length limits.
