import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("responses")
    .setDescription("Use NanoGPT's Responses API")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("create")
            .setDescription("Create a response")
            .addStringOption((option) => option.setName("input").setDescription("Input text").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Model").setRequired(false))
            .addStringOption((option) => option.setName("character").setDescription("Character ID or slug").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced Responses JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "ADVANCED_CHAT");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const input = interaction.options.getString("input", true);
        const model = interaction.options.getString("model");
        const character = interaction.options.getString("character");
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            input,
            model,
            character_id: character,
        });
        const result = await nanogpt.createResponse(body);
        await replyJson(interaction, "Response", result, "nanogpt-response.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to create response." });
    }
}
