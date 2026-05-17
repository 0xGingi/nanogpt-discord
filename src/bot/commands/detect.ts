import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("detect")
    .setDescription("AI and plagiarism detection")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("ai")
            .setDescription("Run AI text detection")
            .addStringOption((option) => option.setName("text").setDescription("Text to inspect").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Advanced detection JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("plagiarism")
            .setDescription("Run plagiarism detection")
            .addStringOption((option) => option.setName("text").setDescription("Text to inspect").setRequired(true))
            .addStringOption((option) => option.setName("json").setDescription("Advanced detection JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "DETECTION");
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
        const mode = interaction.options.getSubcommand() as "ai" | "plagiarism";
        const result = await nanogpt.aiDetection(
            interaction.options.getString("text", true),
            mode,
            parseJsonOption(interaction.options.getString("json"))
        );
        await replyJson(interaction, "Detection", result, "nanogpt-detection.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to run detection." });
    }
}
