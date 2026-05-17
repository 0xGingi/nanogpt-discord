import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson, splitCsv } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("search")
    .setDescription("NanoGPT search utilities")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("web")
            .setDescription("Run direct NanoGPT web search")
            .addStringOption((option) => option.setName("query").setDescription("Search query").setRequired(true))
            .addStringOption((option) => option.setName("provider").setDescription("Search provider").setRequired(false))
            .addStringOption((option) => option.setName("domains").setDescription("Comma-separated domain filter").setRequired(false))
            .addIntegerOption((option) => option.setName("limit").setDescription("Result limit").setRequired(false).setMinValue(1).setMaxValue(50))
            .addStringOption((option) => option.setName("json").setDescription("Advanced web search JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "DIRECT_SEARCH");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }
    const paygoCheck = canUseFeature(interaction, "PAYGO");
    if (!paygoCheck.allowed) {
        await interaction.reply({ content: paygoCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            query: interaction.options.getString("query", true),
            provider: interaction.options.getString("provider"),
            domains: splitCsv(interaction.options.getString("domains")),
            limit: interaction.options.getInteger("limit"),
        });
        const result = await nanogpt.directWebSearch(body);
        await replyJson(interaction, "Web Search", result, "nanogpt-web-search.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to search." });
    }
}
