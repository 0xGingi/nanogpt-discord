import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("YouTube utilities")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("transcribe")
            .setDescription("Transcribe a YouTube video")
            .addStringOption((option) => option.setName("url").setDescription("YouTube URL").setRequired(true))
            .addStringOption((option) => option.setName("language").setDescription("Preferred language").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced YouTube JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const paygoCheck = canUseFeature(interaction, "PAYGO");
    if (!paygoCheck.allowed) {
        await interaction.reply({ content: paygoCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            url: interaction.options.getString("url", true),
            language: interaction.options.getString("language"),
        });
        const result = await nanogpt.youtubeTranscribe(body);
        await replyJson(interaction, "YouTube Transcript", result, "nanogpt-youtube-transcript.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to transcribe YouTube video." });
    }
}
