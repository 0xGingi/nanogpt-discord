import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("tokens")
    .setDescription("Token utilities")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("count")
            .setDescription("Count tokens for a Messages API request")
            .addStringOption((option) => option.setName("message").setDescription("Message text").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Model").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Advanced count_tokens JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "ADVANCED_CHAT");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            model: interaction.options.getString("model", true),
            messages: [{ role: "user", content: interaction.options.getString("message", true) }],
        });
        const result = await nanogpt.countMessageTokens(body);
        await replyJson(interaction, "Token Count", result, "nanogpt-token-count.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to count tokens." });
    }
}
