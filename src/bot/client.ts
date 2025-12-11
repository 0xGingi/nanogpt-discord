import {
    Client,
    GatewayIntentBits,
    Events,
    ChatInputCommandInteraction,
} from "discord.js";
import { commands } from "./commands/index.ts";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN environment variable is required");
}

export const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`[Bot] Ready! Logged in as ${readyClient.user.tag}`);
    console.log(`[Bot] Serving ${readyClient.guilds.cache.size} guild(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);

        if (!command?.autocomplete) {
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(`[Bot] Autocomplete error for ${interaction.commandName}:`, error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
        console.error(`[Bot] Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        console.log(
            `[Bot] Executing command: ${interaction.commandName} by ${interaction.user.tag}`
        );
        await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
        console.error(`[Bot] Error executing ${interaction.commandName}:`, error);

        const errorReply = {
            content: "There was an error while executing this command.",
            ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
        } else {
            await interaction.reply(errorReply);
        }
    }
});

export async function startBot() {
    console.log("[Bot] Connecting to Discord...");
    await client.login(DISCORD_TOKEN);
}

