import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands and how to use them");

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setTitle("NanoGPT Bot Help")
        .setDescription("A Discord bot powered by NanoGPT API for AI conversations with document context support.")
        .addFields(
            {
                name: "/chat",
                value: [
                    "Chat with the AI assistant.",
                    "**Options:**",
                    "• `message` (required) - Your message to the AI",
                    "• `context` - Name of a saved context to include",
                    "• `model` - Override the default model for this message",
                    "• `searchprovider` - Enable web search with a provider",
                    "• `searchvariant` - Select provider-specific search behavior",
                    "• `temperature`, `top_p`, `max_tokens` - Sampling controls",
                    "• `reasoning`, `provider`, `billing`, `suffix`, `json` - Advanced NanoGPT options",
                    "• `image` - Attach an image to analyze (png, jpg, jpeg, webp)",
                ].join("\n"),
                inline: false,
            },
            {
                name: "/context",
                value: [
                    "Manage document contexts for AI conversations.",
                    "**Subcommands:**",
                    "• `/context add` - Upload a document (PDF, TXT, MD, etc.)",
                    "• `/context list` - List all saved contexts",
                    "• `/context view` - View a context's content",
                    "• `/context remove` - Remove a saved context",
                    "**Scope:** Use `scope:user` (personal, default) or `scope:server` (shared)",
                ].join("\n"),
                inline: false,
            },
            {
                name: "/setmodel",
                value: [
                    "Set the default AI model.",
                    "**Options:**",
                    "• `model` (required) - The model to use",
                    "• `scope` - Apply to yourself or the entire server",
                ].join("\n"),
                inline: false,
            },
            {
                name: "/models",
                value: "List NanoGPT model catalogs: subscription, paid, canonical, image, video, audio, embedding, character, and personalized.",
                inline: false,
            },
            {
                name: "/usage",
                value: "Check your NanoGPT API usage (daily and monthly limits).",
                inline: false,
            },
            {
                name: "/imagine",
                value: [
                    "Generate images using AI.",
                    "**Options:**",
                    "• `prompt` (required) - Text description of the image",
                    "• `model` - Image model to use (autocomplete available)",
                    "• `size` - Image size (256x256, 512x512, 1024x1024)",
                    "• `guidance` - How closely to follow the prompt (0-20)",
                    "• `steps` - Denoising steps (1-100)",
                    "• `seed` - Random seed for reproducible results",
                    "• `image` - Input image for img2img transformation",
                    "• `strength` - Img2img strength (0-1)",
                ].join("\n"),
                inline: false,
            },
            {
                name: "/memory",
                value: [
                    "Chat with AI that remembers your conversation history.",
                    "**Subcommands:**",
                    "• `/memory chat` - Chat with persistent memory (same options as /chat)",
                    "• `/memory view` - View recent conversation history",
                    "• `/memory stats` - Show your memory statistics",
                    "• `/memory clear` - Clear your conversation memory",
                ].join("\n"),
                inline: false,
            },
            {
                name: "/scrape",
                value: [
                    "Scrape content from web pages.",
                    "**Options:**",
                    "• `url` (required) - URL to scrape (up to 5 URLs: url, url2-url5)",
                    "• `stealth` - Use stealth mode for tougher targets (5x cost)",
                    "• `download` - Attach results as .md file(s)",
                ].join("\n"),
                inline: false,
            },
            {
                name: "API parity commands",
                value: [
                    "• `/responses create`, `/messages create`, `/completion`, `/tokens count`",
                    "• `/extract firecrawl|maps|maps-reviews|facebook-ads|instagram-profile|instagram-posts|reddit|tiktok|hunter`",
                    "• `/image generate|edit|classify`, `/video generate|status|recover|extend|content`",
                    "• `/audio speech|tts|tts-status|transcribe|transcribe-status|voice-clone`",
                    "• `/search web`, `/embed create`, `/detect ai|plagiarism`, `/youtube transcribe`",
                    "• `/tee attestation|signature`, `/characters search|mine|view|create|edit|delete|review|report`",
                    "Most commands include a `json` option for advanced NanoGPT fields.",
                ].join("\n"),
                inline: false,
            }
        )
        .setFooter({ text: "Tip: Use /memory for persistent conversations, or /chat for stateless queries!" })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
