// Initialize database first
import "./db/index.ts";

// Start the bot
import { startBot } from "./bot/client.ts";

console.log("[Main] Starting NanoGPT Discord Bot...");
console.log("[Main] System Prompt:", process.env.SYSTEM_PROMPT?.substring(0, 50) + "...");
console.log("[Main] Default Model:", process.env.DEFAULT_MODEL || "zai-org/GLM-4.5-Air");

startBot().catch((error) => {
    console.error("[Main] Failed to start bot:", error);
    process.exit(1);
});
