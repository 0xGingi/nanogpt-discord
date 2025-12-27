#!/bin/sh
# Register slash commands with Discord
bun run register

# Start the bot
exec bun run src/index.ts
