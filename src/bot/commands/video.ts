import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("video")
    .setDescription("NanoGPT video generation")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("generate")
            .setDescription("Start video generation")
            .addStringOption((option) => option.setName("prompt").setDescription("Prompt").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Video model").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced video JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("status")
            .setDescription("Check video generation status")
            .addStringOption((option) => option.setName("request_id").setDescription("Request/run ID").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("recover")
            .setDescription("Recover video request data")
            .addStringOption((option) => option.setName("json").setDescription("Recover request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("extend")
            .setDescription("Extend a generated video")
            .addStringOption((option) => option.setName("json").setDescription("Extend request JSON").setRequired(true))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("content")
            .setDescription("Fetch video content metadata")
            .addStringOption((option) => option.setName("request_id").setDescription("Request/run ID").setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "VIDEO");
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
        const subcommand = interaction.options.getSubcommand();
        let result: unknown;
        if (subcommand === "generate") {
            result = await nanogpt.generateVideo(mergeDefined(parseJsonOption(interaction.options.getString("json")), {
                prompt: interaction.options.getString("prompt", true),
                model: interaction.options.getString("model"),
            }));
        } else if (subcommand === "status") {
            result = await nanogpt.videoStatus(interaction.options.getString("request_id", true));
        } else if (subcommand === "recover") {
            result = await nanogpt.videoRecover(parseJsonOption(interaction.options.getString("json")));
        } else if (subcommand === "extend") {
            result = await nanogpt.videoExtend(parseJsonOption(interaction.options.getString("json")));
        } else {
            result = await nanogpt.videoContent({ requestId: interaction.options.getString("request_id", true) });
        }
        await replyJson(interaction, "Video", result, "nanogpt-video.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Video command failed." });
    }
}
