import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create embeddings")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("create")
            .setDescription("Create an embedding")
            .addStringOption((option) => option.setName("input").setDescription("Input text").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Embedding model").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced embeddings JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "EMBEDDINGS");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }
    const paygoCheck = canUseFeature(interaction, "PAYGO");
    if (!paygoCheck.allowed) {
        await interaction.reply({ content: paygoCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            input: interaction.options.getString("input", true),
            model: interaction.options.getString("model") || "text-embedding-3-small",
        });
        const result = await nanogpt.createEmbedding(body);
        await replyJson(interaction, "Embedding", result, "nanogpt-embedding.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to create embedding." });
    }
}
