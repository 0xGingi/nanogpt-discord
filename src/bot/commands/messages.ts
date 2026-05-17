import { Attachment, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { nanogpt } from "../../api/nanogpt.ts";
import { attachmentToDataUrl, IMAGE_TYPES, mergeDefined, parseJsonOption, replyJson } from "./nanogpt-utils.ts";
import { canUseFeature } from "../../utils/features.ts";

export const data = new SlashCommandBuilder()
    .setName("messages")
    .setDescription("Use NanoGPT's Anthropic-compatible Messages API")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("create")
            .setDescription("Create a message")
            .addStringOption((option) => option.setName("message").setDescription("User message").setRequired(true))
            .addStringOption((option) => option.setName("model").setDescription("Model").setRequired(true))
            .addIntegerOption((option) => option.setName("max_tokens").setDescription("Maximum output tokens").setRequired(false).setMinValue(1))
            .addAttachmentOption((option) => option.setName("image").setDescription("Image or PDF block attachment").setRequired(false))
            .addStringOption((option) => option.setName("json").setDescription("Advanced Messages JSON options").setRequired(false))
    );

async function content(message: string, attachment: Attachment | null): Promise<unknown> {
    if (!attachment) return message;
    const dataUrl = await attachmentToDataUrl(attachment, [...IMAGE_TYPES, "application/pdf"]);
    return [
        { type: "text", text: message },
        attachment.contentType === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: dataUrl.split(",")[1] } }
            : { type: "image", source: { type: "base64", media_type: attachment.contentType, data: dataUrl.split(",")[1] } },
    ];
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const featureCheck = canUseFeature(interaction, "ADVANCED_CHAT");
    if (!featureCheck.allowed) {
        await interaction.reply({ content: featureCheck.reason, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        const message = interaction.options.getString("message", true);
        const model = interaction.options.getString("model", true);
        const maxTokens = interaction.options.getInteger("max_tokens");
        const attachment = interaction.options.getAttachment("image");
        const body = mergeDefined(parseJsonOption(interaction.options.getString("json")), {
            model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: await content(message, attachment) }],
        });
        const result = await nanogpt.createMessage(body);
        await replyJson(interaction, "Message", result, "nanogpt-message.json");
    } catch (error) {
        await interaction.editReply({ content: error instanceof Error ? error.message : "Failed to create message." });
    }
}
