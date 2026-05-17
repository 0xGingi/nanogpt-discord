import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { attachmentToDataUrl, IMAGE_TYPES, mergeDefined, parseJsonOption, replyJson, splitCsv } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("image")
    .setDescription("NanoGPT image utilities")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("generate")
            .setDescription("Generate an image")
            .addStringOption((option) => option.setName("prompt").setDescription("Prompt").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Image model").setRequired(false))
            .addStringOption((option) => option.setName("size").setDescription("Size").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced image JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("edit")
            .setDescription("Edit an image")
            .addStringOption((option) => option.setName("prompt").setDescription("Edit prompt").setRequired(true))
            .addAttachmentOption((option) => option.setName("image").setDescription("Input image").setRequired(true))
            .addAttachmentOption((option) => option.setName("mask").setDescription("Mask image").setRequired(false))
            .addStringOption((option) => option.setName("model").setDescription("Edit model").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced image edit JSON options").setRequired(false))
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("classify")
            .setDescription("Classify image NSFW risk")
            .addAttachmentOption((option) => option.setName("image").setDescription("Image attachment").setRequired(false))
            .addStringOption((option) => option.setName("urls").setDescription("Comma-separated image URLs").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced NSFW JSON options").setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "IMAGEGEN");
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
        const extra = parseJsonOption(interaction.options.getString("json"));

        if (subcommand === "generate") {
            const result = await nanogpt.generateImage(interaction.options.getString("prompt", true), {
                model: interaction.options.getString("model") || undefined,
                size: interaction.options.getString("size") || undefined,
                response_format: "url",
                extra,
            });
            await replyJson(interaction, "Image Generation", result, "nanogpt-image-generation.json");
            return;
        }

        if (subcommand === "edit") {
            const image = interaction.options.getAttachment("image", true);
            const mask = interaction.options.getAttachment("mask");
            const body = mergeDefined(extra, {
                prompt: interaction.options.getString("prompt", true),
                model: interaction.options.getString("model"),
                image: await attachmentToDataUrl(image, IMAGE_TYPES),
                mask: mask ? await attachmentToDataUrl(mask, IMAGE_TYPES) : undefined,
            });
            const result = await nanogpt.editImage(body);
            await replyJson(interaction, "Image Edit", result, "nanogpt-image-edit.json");
            return;
        }

        const attachment = interaction.options.getAttachment("image");
        const urls = splitCsv(interaction.options.getString("urls"));
        if (attachment) urls.push(await attachmentToDataUrl(attachment, IMAGE_TYPES));
        const result = await nanogpt.classifyNsfw(mergeDefined(extra, { images: urls }));
        await replyJson(interaction, "NSFW Classification", result, "nanogpt-nsfw.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Image command failed." });
    }
}
