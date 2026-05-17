import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("completion")
    .setDescription("Use NanoGPT's legacy completions API")
    .addStringOption((option) => option.setName("prompt").setDescription("Prompt").setRequired(true))
    .addStringOption((option) => option.setName("model").setDescription("Model").setRequired(true))
    .addIntegerOption((option) => option.setName("max_tokens").setDescription("Maximum output tokens").setRequired(false).setMinValue(1))
    .addStringOption((option) => option.setName("json").setDescription("Advanced completion JSON options").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "ADVANCED_CHAT");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            model: interaction.options.getString("model", true),
            prompt: interaction.options.getString("prompt", true),
            max_tokens: interaction.options.getInteger("max_tokens"),
        });
        const result = await nanogpt.completion(body);
        await replyJson(interaction, "Completion", result, "nanogpt-completion.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to create completion." });
    }
}
