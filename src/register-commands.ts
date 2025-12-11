import { REST, Routes } from "discord.js";
import { getCommandsJSON } from "./bot/commands/index.ts";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN environment variable is required");
}

if (!DISCORD_CLIENT_ID) {
    throw new Error("DISCORD_CLIENT_ID environment variable is required");
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function registerCommands() {
    try {
        const commands = getCommandsJSON();

        console.log(`[Register] Started refreshing ${commands.length} application (/) commands.`);

        // Register commands globally
        const data = await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID as string), {
            body: commands,
        });

        console.log(`[Register] Successfully reloaded application (/) commands.`);
        console.log("[Register] Commands registered:");
        for (const cmd of commands) {
            console.log(`  - /${cmd.name}: ${cmd.description}`);
        }
    } catch (error) {
        console.error("[Register] Error registering commands:", error);
        process.exit(1);
    }
}

registerCommands();
